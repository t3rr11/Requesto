import fs from 'fs';
import path from 'path';
import { Workspace, WorkspacesRegistry } from '../models/workspace';
import { BaseRepository } from './base.repository';
import { atomicWrite, ensureDir } from '../utils/file';

const DATA_FILES = ['collections.json', 'environments.json', 'oauth-configs.json'];
const LOCAL_DATA_FILES = ['history.json'];

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
    return this.getActiveWorkspace().path;
  }

  getLocalDir(): string {
    return path.join(this.getActiveWorkspace().path, '.requesto');
  }

  // ── Workspace mutation ───────────────────────────────────────────────────

  create(name: string): Workspace {
    const id = generateId();
    const workspacePath = path.join(this.workspacesDir, id);
    const registry = this.getRegistry();

    const workspace: Workspace = {
      id,
      name,
      path: workspacePath,
      createdAt: Date.now(),
      updatedAt: Date.now(),
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
      path: resolvedPath,
      createdAt: Date.now(),
      updatedAt: Date.now(),
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
      path: resolvedPath,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.ensureLocalDirs(resolvedPath);

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
      ...updates,
      updatedAt: Date.now(),
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

  exportData(id: string): Record<string, unknown> {
    const workspace = this.findById(id);
    if (!workspace) throw new Error('Workspace not found');

    const data: Record<string, unknown> = { name: workspace.name };
    for (const file of DATA_FILES) {
      const filePath = path.join(workspace.path, file);
      if (fs.existsSync(filePath)) {
        try {
          data[file] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch {
          data[file] = null;
        }
      }
    }
    return data;
  }

  importData(bundle: Record<string, unknown>): Workspace {
    const name = typeof bundle.name === 'string' ? bundle.name : 'Imported Workspace';
    const workspace = this.create(name);

    for (const file of DATA_FILES) {
      if (bundle[file] != null) {
        const filePath = path.join(workspace.path, file);
        atomicWrite(filePath, bundle[file]);
      }
    }
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

      for (const file of DATA_FILES) {
        const src = path.join(this.dataDir, file);
        const dest = path.join(defaultPath, file);
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
          fs.unlinkSync(src);
        }
      }

      const localDir = path.join(defaultPath, '.requesto');
      for (const file of LOCAL_DATA_FILES) {
        const src = path.join(this.dataDir, file);
        const dest = path.join(localDir, file);
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
          fs.unlinkSync(src);
        }
      }

      // Split OAuth secrets into separate local file
      const oauthConfigPath = path.join(defaultPath, 'oauth-configs.json');
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

      console.log('Migration complete.');
    } else {
      this.ensureWorkspaceDirs(defaultPath);
      this.initializeWorkspaceFiles(defaultPath);
    }

    const workspace: Workspace = {
      id: generateId(),
      name: 'Local Workspace',
      path: defaultPath,
      createdAt: Date.now(),
      updatedAt: Date.now(),
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
  }

  private ensureLocalDirs(workspacePath: string): void {
    ensureDir(path.join(workspacePath, '.requesto'));
    const localDir = path.join(workspacePath, '.requesto');
    const historyFile = path.join(localDir, 'history.json');
    const secretsFile = path.join(localDir, 'oauth-secrets.json');
    if (!fs.existsSync(historyFile)) atomicWrite(historyFile, []);
    if (!fs.existsSync(secretsFile)) atomicWrite(secretsFile, { secrets: {} });
  }

  private initializeWorkspaceFiles(workspacePath: string): void {
    this.ensureWorkspaceDirs(workspacePath);

    const defaults: Record<string, unknown> = {
      'collections.json': [],
      'environments.json': { activeEnvironmentId: null, environments: [] },
      'oauth-configs.json': { configs: [] },
    };

    for (const [file, defaultData] of Object.entries(defaults)) {
      const filePath = path.join(workspacePath, file);
      if (!fs.existsSync(filePath)) atomicWrite(filePath, defaultData);
    }

    const localDir = path.join(workspacePath, '.requesto');
    if (!fs.existsSync(path.join(localDir, 'history.json')))
      atomicWrite(path.join(localDir, 'history.json'), []);
    if (!fs.existsSync(path.join(localDir, 'oauth-secrets.json')))
      atomicWrite(path.join(localDir, 'oauth-secrets.json'), { secrets: {} });
  }
}
