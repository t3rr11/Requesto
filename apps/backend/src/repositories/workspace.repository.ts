import fs from 'node:fs';
import path from 'node:path';
import { Workspace, WorkspacesRegistry } from '../models/workspace';
import { BaseRepository } from './base.repository';
import { atomicWrite, ensureDir } from '../utils/file';
import { readOrderSection, writeOrderSection, type OrderSection } from '../utils/order';
import { resolveUniqueFileName } from '../utils/slug';

const DATA_FILES = ['collections.json', 'environments.json', 'oauth-configs.json', 'graphql-schemas.json'];
const LOCAL_DATA_FILES = ['history.json'];
const LOCAL_ONLY_FILES = [
  ...LOCAL_DATA_FILES,
  'oauth-secrets.json',
  'oauth-tokens.json',
  'environments.local.json',
  'active-environment.json',
];

/**
 * Mapping between the legacy monolithic data files and their split-layout
 * counterparts (one file per item) plus their section in the order manifest.
 */
const SPLIT_DATA: { file: string; dir: string; section: OrderSection; listKey?: string }[] = [
  { file: 'collections.json', dir: 'collections', section: 'collections' },
  { file: 'environments.json', dir: 'environments', section: 'environments', listKey: 'environments' },
  { file: 'oauth-configs.json', dir: 'oauth-configs', section: 'oauthConfigs', listKey: 'configs' },
  { file: 'graphql-schemas.json', dir: 'graphql-schemas', section: 'graphqlSchemas' },
];

function generateId(): string {
  return `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export class WorkspaceRepository extends BaseRepository {
  constructor(
    private readonly dataDir: string,
    private readonly workspacesDir: string,
    private readonly workspacesFile: string,
  ) {
    super();
  }

  getWorkspacesDir(): string {
    return this.workspacesDir;
  }

  getRegistry(): WorkspacesRegistry {
    return this.readJson<WorkspacesRegistry>(this.workspacesFile, {
      activeWorkspaceId: '',
      workspaces: [],
    });
  }

  saveRegistry(registry: WorkspacesRegistry): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    atomicWrite(this.workspacesFile, registry);
  }

  getActiveWorkspace(): Workspace {
    const registry = this.getRegistry();
    const workspace = registry.workspaces.find((w) => w.id === registry.activeWorkspaceId);
    if (!workspace) {
      throw new Error('No active workspace found. Workspace registry may be corrupted.');
    }
    return workspace;
  }

  findById(id: string): Workspace | null {
    const registry = this.getRegistry();
    return registry.workspaces.find((w) => w.id === id) ?? null;
  }

  getDataDir(): string {
    return path.join(this.getActiveWorkspace().path, '.requesto');
  }

  getLocalDir(): string {
    return path.join(this.getActiveWorkspace().path, '.requesto', 'local');
  }

  // ── Workspace mutation ───────────────────────────────────────────────────

  create(name: string): Workspace {
    const id = generateId();
    const workspacePath = path.join(this.workspacesDir, id);
    const registry = this.getRegistry();

    const workspace: Workspace = {
      id,
      name,
      path: workspacePath
    };

    this.initializeWorkspaceFiles(workspacePath);

    registry.workspaces.push(workspace);
    if (!registry.activeWorkspaceId) {
      registry.activeWorkspaceId = workspace.id;
    }
    this.saveRegistry(registry);
    return workspace;
  }

  createAtPath(name: string, workspacePath: string): Workspace {
    const resolvedPath = path.resolve(workspacePath);
    const registry = this.getRegistry();

    const duplicate = registry.workspaces.find((w) => w.path === resolvedPath);
    if (duplicate) {
      throw new Error(`A workspace already exists at this path: ${duplicate.name}`);
    }

    const workspace: Workspace = {
      id: generateId(),
      name,
      path: resolvedPath
    };

    this.initializeWorkspaceFiles(resolvedPath);

    registry.workspaces.push(workspace);
    if (!registry.activeWorkspaceId) {
      registry.activeWorkspaceId = workspace.id;
    }
    this.saveRegistry(registry);
    return workspace;
  }

  open(name: string, workspacePath: string): Workspace {
    const resolvedPath = path.resolve(workspacePath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Directory does not exist: ${resolvedPath}`);
    }

    const registry = this.getRegistry();
    const existing = registry.workspaces.find((w) => w.path === resolvedPath);
    if (existing) return existing;

    const workspace: Workspace = {
      id: generateId(),
      name,
      path: resolvedPath
    };

    // Migrate old root-level layout to .requesto/ if needed
    const hasOldLayout = DATA_FILES.some((f) => fs.existsSync(path.join(resolvedPath, f)));
    const hasNewLayout = DATA_FILES.some((f) => fs.existsSync(path.join(resolvedPath, '.requesto', f)));
    if (hasOldLayout && !hasNewLayout) {
      this.migrateToRequestoLayout(resolvedPath);
    }

    this.ensureLocalDirs(resolvedPath);
    // Split monolithic data files into per-item files (idempotent, no-op when already split)
    this.migrateToSplitLayout(resolvedPath);

    registry.workspaces.push(workspace);
    if (!registry.activeWorkspaceId) {
      registry.activeWorkspaceId = workspace.id;
    }
    this.saveRegistry(registry);
    return workspace;
  }

  update(id: string, updates: { name?: string }): Workspace | null {
    const registry = this.getRegistry();
    const index = registry.workspaces.findIndex((w) => w.id === id);
    if (index === -1) return null;

    registry.workspaces[index] = {
      ...registry.workspaces[index],
      ...updates
    };
    this.saveRegistry(registry);
    return registry.workspaces[index];
  }

  delete(id: string): boolean {
    const registry = this.getRegistry();
    const index = registry.workspaces.findIndex((w) => w.id === id);
    if (index === -1) return false;

    if (registry.workspaces.length === 1) {
      throw new Error('Cannot delete the last workspace');
    }

    registry.workspaces.splice(index, 1);
    if (registry.activeWorkspaceId === id) {
      registry.activeWorkspaceId = registry.workspaces[0].id;
    }
    this.saveRegistry(registry);
    return true;
  }

  setActive(id: string): Workspace {
    const registry = this.getRegistry();
    const workspace = registry.workspaces.find((w) => w.id === id);
    if (!workspace) throw new Error(`Workspace not found: ${id}`);
    if (!fs.existsSync(workspace.path)) {
      throw new Error(`Workspace directory no longer exists: ${workspace.path}`);
    }

    registry.activeWorkspaceId = id;
    this.saveRegistry(registry);
    return workspace;
  }

  // ── Export / Import ──────────────────────────────────────────────────────

  /** Read all items of a split-layout section, ordered by the order manifest. */
  private readSplitItems(
    requestoDir: string,
    entry: { dir: string; section: OrderSection },
  ): Record<string, unknown>[] {
    const dir = path.join(requestoDir, entry.dir);
    const byId = new Map<string, Record<string, unknown>>();
    if (fs.existsSync(dir)) {
      for (const fileName of fs.readdirSync(dir)) {
        if (!fileName.endsWith('.json')) continue;
        try {
          const parsed: unknown = JSON.parse(fs.readFileSync(path.join(dir, fileName), 'utf-8'));
          const id = (parsed as { id?: unknown } | null)?.id;
          if (typeof id === 'string' && !byId.has(id)) byId.set(id, parsed as Record<string, unknown>);
        } catch {
          // Skip unreadable files
        }
      }
    }

    const ordered: Record<string, unknown>[] = [];
    const seen = new Set<string>();
    for (const id of readOrderSection(requestoDir, entry.section)) {
      const item = byId.get(id);
      if (item) {
        ordered.push(item);
        seen.add(id);
      }
    }
    for (const [id, item] of byId) {
      if (!seen.has(id)) ordered.push(item);
    }
    return ordered;
  }

  /** The locally stored active environment id, when it refers to an exported environment. */
  private getExportedActiveEnvironmentId(
    requestoDir: string,
    environments: { id: string }[],
  ): string | null {
    try {
      const filePath = path.join(requestoDir, 'local', 'active-environment.json');
      if (!fs.existsSync(filePath)) return null;
      const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const id = (parsed as { activeEnvironmentId?: unknown } | null)?.activeEnvironmentId;
      return typeof id === 'string' && environments.some((e) => e.id === id) ? id : null;
    } catch {
      return null;
    }
  }

  exportData(id: string): Record<string, unknown> {
    const workspace = this.findById(id);
    if (!workspace) throw new Error('Workspace not found');

    const requestoDir = path.join(workspace.path, '.requesto');
    const data: Record<string, unknown> = { name: workspace.name };

    for (const entry of SPLIT_DATA) {
      const items = this.readSplitItems(requestoDir, entry);
      if (entry.file === 'environments.json') {
        data[entry.file] = {
          activeEnvironmentId: this.getExportedActiveEnvironmentId(requestoDir, items as { id: string }[]),
          environments: items,
        };
      } else if (entry.file === 'oauth-configs.json') {
        data[entry.file] = { configs: items };
      } else {
        data[entry.file] = items;
      }
    }
    return data;
  }

  importData(bundle: Record<string, unknown>): Workspace {
    const name = typeof bundle.name === 'string' ? bundle.name : 'Imported Workspace';
    const workspace = this.create(name);

    const requestoDir = path.join(workspace.path, '.requesto');
    for (const file of DATA_FILES) {
      if (bundle[file] != null) {
        const filePath = path.join(requestoDir, file);
        atomicWrite(filePath, bundle[file]);
      }
    }

    // Convert the monolithic bundle files into the per-item layout
    this.migrateToSplitLayout(workspace.path);
    return workspace;
  }

  // ── Bootstrap ────────────────────────────────────────────────────────────

  /**
   * Initialize the workspace system on server startup.
   * Migrates pre-workspace flat data layout or creates a fresh Default workspace.
   */
  bootstrap(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    if (fs.existsSync(this.workspacesFile)) {
      const registry = this.getRegistry();
      if (registry.workspaces.length > 0) {
        const active = registry.workspaces.find((w) => w.id === registry.activeWorkspaceId);
        if (active && !fs.existsSync(active.path)) {
          console.warn(
            `Active workspace directory missing: ${active.path}. Switching to first available.`,
          );
          const valid = registry.workspaces.find((w) => fs.existsSync(w.path));
          if (valid) {
            registry.activeWorkspaceId = valid.id;
            this.saveRegistry(registry);
          }
        }
        // Migrate any workspaces still using the old root-level layout to .requesto/
        for (const ws of registry.workspaces) {
          if (!fs.existsSync(ws.path)) continue;
          const hasOldLayout = DATA_FILES.some((f) => fs.existsSync(path.join(ws.path, f)));
          const hasNewLayout = DATA_FILES.some((f) =>
            fs.existsSync(path.join(ws.path, '.requesto', f)),
          );
          if (hasOldLayout && !hasNewLayout) {
            console.log(`Migrating workspace "${ws.name}" to .requesto/ layout...`);
            this.migrateToRequestoLayout(ws.path);
          }
          this.ensureLocalDirs(ws.path);
          // Split monolithic data files into per-item files (idempotent)
          this.migrateToSplitLayout(ws.path);
          // Always ensure local-only files aren't stranded in .requesto/ (e.g. oauth-tokens.json)
          this.rescueLocalFiles(ws.path);
          this.ensureRequestoGitignore(ws.path);
        }
        return;
      }
    }

    const hasExistingData = DATA_FILES.some((f) =>
      fs.existsSync(path.join(this.dataDir, f)),
    );
    const defaultPath = path.join(this.dataDir, 'Default');

    if (hasExistingData) {
      console.log('Migrating existing data into Default workspace...');
      this.ensureWorkspaceDirs(defaultPath);

      const requestoDir = path.join(defaultPath, '.requesto');
      for (const file of DATA_FILES) {
        const src = path.join(this.dataDir, file);
        const dest = path.join(requestoDir, file);
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
          fs.unlinkSync(src);
        }
      }

      const localDir = path.join(defaultPath, '.requesto', 'local');
      for (const file of LOCAL_DATA_FILES) {
        const src = path.join(this.dataDir, file);
        const dest = path.join(localDir, file);
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
          fs.unlinkSync(src);
        }
      }

      // Split OAuth secrets into separate local file
      const oauthConfigPath = path.join(requestoDir, 'oauth-configs.json');
      if (fs.existsSync(oauthConfigPath)) {
        try {
          const oauthData = JSON.parse(fs.readFileSync(oauthConfigPath, 'utf-8'));
          const secrets: Record<string, string> = {};

          if (oauthData.configs && Array.isArray(oauthData.configs)) {
            oauthData.configs = oauthData.configs.map(
              (config: { id: string; clientSecret?: string }) => {
                if (config.clientSecret) {
                  secrets[config.id] = config.clientSecret;
                  const { clientSecret: _, ...rest } = config;
                  return rest;
                }
                return config;
              },
            );
          }
          atomicWrite(oauthConfigPath, oauthData);
          atomicWrite(path.join(localDir, 'oauth-secrets.json'), { secrets });
        } catch (error) {
          console.error('Error splitting OAuth secrets during migration:', error);
        }
      }

      const historyFile = path.join(localDir, 'history.json');
      if (!fs.existsSync(historyFile)) atomicWrite(historyFile, []);

      // Split monolithic data files into per-item files (idempotent)
      this.migrateToSplitLayout(defaultPath);

      console.log('Migration complete.');
    } else {
      this.ensureWorkspaceDirs(defaultPath);
      this.initializeWorkspaceFiles(defaultPath);
    }

    const workspace: Workspace = {
      id: generateId(),
      name: 'Local Workspace',
      path: defaultPath
    };

    const registry: WorkspacesRegistry = {
      activeWorkspaceId: workspace.id,
      workspaces: [workspace],
    };

    this.saveRegistry(registry);
    console.log(
      `Workspace system initialized. Active workspace: "${workspace.name}" at ${workspace.path}`,
    );
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private ensureWorkspaceDirs(workspacePath: string): void {
    ensureDir(workspacePath);
    ensureDir(path.join(workspacePath, '.requesto'));
    ensureDir(path.join(workspacePath, '.requesto', 'local'));
  }

  private ensureLocalDirs(workspacePath: string): void {
    ensureDir(path.join(workspacePath, '.requesto'));
    const localDir = path.join(workspacePath, '.requesto', 'local');
    ensureDir(localDir);
    const historyFile = path.join(localDir, 'history.json');
    const secretsFile = path.join(localDir, 'oauth-secrets.json');
    if (!fs.existsSync(historyFile)) atomicWrite(historyFile, []);
    if (!fs.existsSync(secretsFile)) atomicWrite(secretsFile, { secrets: {} });
  }

  private initializeWorkspaceFiles(workspacePath: string): void {
    this.ensureWorkspaceDirs(workspacePath);

    const requestoDir = path.join(workspacePath, '.requesto');
    // Per-item data directories (each collection/environment/config lives in its own file)
    for (const { dir } of SPLIT_DATA) {
      ensureDir(path.join(requestoDir, dir));
    }

    const localDir = path.join(workspacePath, '.requesto', 'local');
    if (!fs.existsSync(path.join(localDir, 'history.json')))
      atomicWrite(path.join(localDir, 'history.json'), []);
    if (!fs.existsSync(path.join(localDir, 'oauth-secrets.json')))
      atomicWrite(path.join(localDir, 'oauth-secrets.json'), { secrets: {} });
  }

  private migrateToRequestoLayout(workspacePath: string): void {
    const requestoDir = path.join(workspacePath, '.requesto');
    const localDir = path.join(requestoDir, 'local');
    ensureDir(requestoDir);
    ensureDir(localDir);

    // Move DATA_FILES from workspace root into .requesto/
    for (const file of DATA_FILES) {
      const src = path.join(workspacePath, file);
      const dest = path.join(requestoDir, file);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        fs.renameSync(src, dest);
      }
    }

    // Move local files from old .requesto/ into .requesto/local/
    for (const file of LOCAL_ONLY_FILES) {
      const src = path.join(requestoDir, file);
      const dest = path.join(localDir, file);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        fs.renameSync(src, dest);
      }
    }

    // Create .requesto/.gitignore to ignore the local/ subdirectory
    const requestoDotGitignore = path.join(requestoDir, '.gitignore');
    if (!fs.existsSync(requestoDotGitignore)) {
      fs.writeFileSync(requestoDotGitignore, '# Requesto local data (history, secrets)\nlocal/\n', 'utf-8');
    }

    // Clean up any Requesto entries previously added to the root .gitignore
    const rootGitignorePath = path.join(workspacePath, '.gitignore');
    if (fs.existsSync(rootGitignorePath)) {
      const content = fs.readFileSync(rootGitignorePath, 'utf-8');
      const updated = content
        .replace(/^# Requesto local data \(history, secrets\)\n/m, '')
        .replace(/^\.requesto\/local\/\n?/m, '')
        .replace(/^\.requesto\/\n?/m, '');
      if (updated !== content) {
        const trimmed = updated.trimEnd();
        fs.writeFileSync(rootGitignorePath, trimmed ? trimmed + '\n' : '', 'utf-8');
      }
    }

    console.log(`Migration to .requesto/ layout complete for "${workspacePath}".`);
  }

  /**
   * Split legacy monolithic data files (.requesto/collections.json etc.) into
   * one file per item under their data directory, preserving order in
   * .requesto/order.json. The monolithic files are removed after a successful
   * split, making this a no-op for already-migrated workspaces.
   */
  private migrateToSplitLayout(workspacePath: string): void {
    const requestoDir = path.join(workspacePath, '.requesto');
    if (!fs.existsSync(requestoDir)) return;
    const localDir = path.join(requestoDir, 'local');

    for (const entry of SPLIT_DATA) {
      const src = path.join(requestoDir, entry.file);
      if (!fs.existsSync(src)) continue;
      try {
        const parsed: unknown = JSON.parse(fs.readFileSync(src, 'utf-8'));
        let items: Record<string, unknown>[] = [];
        if (entry.listKey) {
          const list = (parsed as Record<string, unknown> | null)?.[entry.listKey];
          if (Array.isArray(list)) items = list as Record<string, unknown>[];
        } else if (Array.isArray(parsed)) {
          items = parsed as Record<string, unknown>[];
        }

        const destDir = path.join(requestoDir, entry.dir);
        ensureDir(destDir);

        const ids: string[] = [];
        for (const item of items) {
          const id = (item as { id?: unknown } | null)?.id;
          if (typeof id !== 'string') continue;
          const name = typeof (item as { name?: unknown }).name === 'string'
            ? (item as { name: string }).name
            : id;
          const fileName = resolveUniqueFileName(destDir, name, id);
          atomicWrite(path.join(destDir, fileName), item);
          ids.push(id);
        }
        writeOrderSection(requestoDir, entry.section, ids);

        // Preserve the user's active environment selection locally (not committed)
        if (entry.file === 'environments.json') {
          const activeId = (parsed as { activeEnvironmentId?: unknown } | null)?.activeEnvironmentId;
          if (typeof activeId === 'string' && ids.includes(activeId)) {
            ensureDir(localDir);
            atomicWrite(path.join(localDir, 'active-environment.json'), { activeEnvironmentId: activeId });
          }
        }

        fs.unlinkSync(src);
        console.log(`Split ${entry.file} into ${entry.dir}/ (${ids.length} items).`);
      } catch (error) {
        console.error(`Error splitting ${entry.file} during migration:`, error);
      }
    }
  }

  private ensureRequestoGitignore(workspacePath: string): void {
    const requestoDir = path.join(workspacePath, '.requesto');
    if (!fs.existsSync(requestoDir)) return;
    const gitignorePath = path.join(requestoDir, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, '# Requesto local data (history, secrets)\nlocal/\n', 'utf-8');
    }
  }

  private rescueLocalFiles(workspacePath: string): void {
    const requestoDir = path.join(workspacePath, '.requesto');
    if (!fs.existsSync(requestoDir)) return;
    const localDir = path.join(requestoDir, 'local');
    for (const file of LOCAL_ONLY_FILES) {
      const src = path.join(requestoDir, file);
      const dest = path.join(localDir, file);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        ensureDir(localDir);
        fs.renameSync(src, dest);
      }
    }
  }
}
