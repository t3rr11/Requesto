import fs from 'node:fs';
import path from 'node:path';
import { WorkspaceRepository } from '../repositories/workspace.repository';
import { AppError } from '../errors/app-error';
import * as git from '../utils/git';
import type { Workspace } from '../models/workspace';

/** Result of inspecting a filesystem path for use as a Requesto workspace. */
export interface WorkspaceInspectResult {
  exists: boolean;
  isDirectory: boolean;
  hasRequestoData: boolean;
  isGitRepo: boolean;
  counts: { collections: number; environments: number; oauthConfigs: number };
  suggestedName: string;
}

const DATA_FILES = ['collections.json', 'environments.json', 'oauth-configs.json', 'graphql-schemas.json'];
const SPLIT_DIRS = ['collections', 'environments', 'oauth-configs', 'graphql-schemas'];

function countJsonEntries(filePath: string, listKey?: string): number {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (Array.isArray(parsed)) return parsed.length;
    if (listKey && typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as Record<string, unknown>)[listKey])) {
      return ((parsed as Record<string, unknown>)[listKey] as unknown[]).length;
    }
    return 0;
  } catch {
    return 0;
  }
}

/** Count per-item JSON files in a split-layout data directory. */
function countSplitItems(dirPath: string): number {
  try {
    return fs.readdirSync(dirPath).filter((f) => f.endsWith('.json')).length;
  } catch {
    return 0;
  }
}

export class WorkspaceService {
  constructor(private readonly repo: WorkspaceRepository) {}

  async getAll(): Promise<{ workspaces: (Workspace & { isGitRepo: boolean })[]; activeWorkspaceId: string }> {
    const registry = this.repo.getRegistry();
    const enriched = await Promise.all(
      registry.workspaces.map(async (workspace) => ({
        ...workspace,
        isGitRepo: await git.isGitRepoRoot(workspace.path).catch(() => false),
      })),
    );
    return { ...registry, workspaces: enriched };
  }

  getActive(): Workspace {
    const workspace = this.repo.getActiveWorkspace();
    if (!workspace) {
      throw AppError.notFound('No active workspace');
    }
    return workspace;
  }

  findById(id: string): Workspace | null {
    return this.repo.findById(id);
  }

  create(name: string, copyFromId?: string): Workspace {
    return this.repo.create(name, copyFromId);
  }

  async clone(name: string, repoUrl: string, authToken?: string): Promise<Workspace> {
    const id = `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const targetPath = path.join(this.repo.getWorkspacesDir(), id);
    await git.cloneRepo(repoUrl, targetPath, authToken);
    return this.repo.open(name, targetPath);
  }

  async open(name: string, workspacePath: string): Promise<Workspace> {
    let workspace: Workspace;
    try {
      workspace = this.repo.open(name, workspacePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to open workspace';
      throw AppError.badRequest(message);
    }

    // Ensure .requesto/.gitignore exists so the local/ folder is never committed
    await git.ensureGitignore(workspacePath);
    return workspace;
  }

  /**
   * Inspect a filesystem path without registering it, so the UI can preview what
   * adding it as a workspace would do.
   */
  async inspect(workspacePath: string): Promise<WorkspaceInspectResult> {
    const resolved = path.resolve(workspacePath);
    const suggestedName = path.basename(resolved) || resolved;

    const exists = fs.existsSync(resolved);
    if (!exists) {
      return {
        exists: false,
        isDirectory: false,
        hasRequestoData: false,
        isGitRepo: false,
        counts: { collections: 0, environments: 0, oauthConfigs: 0 },
        suggestedName,
      };
    }

    const isDirectory = fs.statSync(resolved).isDirectory();
    if (!isDirectory) {
      return {
        exists: true,
        isDirectory: false,
        hasRequestoData: false,
        isGitRepo: false,
        counts: { collections: 0, environments: 0, oauthConfigs: 0 },
        suggestedName,
      };
    }

    const requestoDir = path.join(resolved, '.requesto');
    const hasSplitLayout = SPLIT_DIRS.some((d) => fs.existsSync(path.join(requestoDir, d)));
    const hasNewLayout = hasSplitLayout || DATA_FILES.some((f) => fs.existsSync(path.join(requestoDir, f)));
    const hasLegacyLayout = DATA_FILES.some((f) => fs.existsSync(path.join(resolved, f)));

    // Prefer split-layout counts, falling back to pre-migration monolithic files
    // (.requesto/ monoliths before the split migration runs, then legacy root files)
    const counts = {
      collections: countSplitItems(path.join(requestoDir, 'collections')) ||
        countJsonEntries(path.join(requestoDir, 'collections.json')) ||
        (hasLegacyLayout ? countJsonEntries(path.join(resolved, 'collections.json')) : 0),
      environments: countSplitItems(path.join(requestoDir, 'environments')) ||
        countJsonEntries(path.join(requestoDir, 'environments.json'), 'environments') ||
        (hasLegacyLayout ? countJsonEntries(path.join(resolved, 'environments.json'), 'environments') : 0),
      oauthConfigs: countSplitItems(path.join(requestoDir, 'oauth-configs')) ||
        countJsonEntries(path.join(requestoDir, 'oauth-configs.json'), 'configs') ||
        (hasLegacyLayout ? countJsonEntries(path.join(resolved, 'oauth-configs.json'), 'configs') : 0),
    };

    return {
      exists: true,
      isDirectory: true,
      hasRequestoData: hasNewLayout || hasLegacyLayout,
      isGitRepo: await git.isGitRepoRoot(resolved).catch(() => false),
      counts,
      suggestedName,
    };
  }

  update(id: string, updates: Partial<Pick<Workspace, 'name'>>): Workspace {
    const updated = this.repo.update(id, updates);
    if (!updated) {
      throw AppError.notFound('Workspace not found');
    }
    return updated;
  }

  delete(id: string): void {
    const success = this.repo.delete(id);
    if (!success) {
      throw AppError.notFound('Workspace not found');
    }
  }

  setActive(id: string): Workspace {
    return this.repo.setActive(id);
  }

  exportData(id: string): unknown {
    return this.repo.exportData(id);
  }

  importData(bundle: Record<string, unknown>): Workspace {
    return this.repo.importData(bundle);
  }

  bootstrap(): void {
    this.repo.bootstrap();
  }
}
