import path from 'path';
import { WorkspaceRepository } from '../repositories/workspace.repository';
import { AppError } from '../errors/app-error';
import * as git from '../utils/git';
import type { Workspace } from '../models/workspace';

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

  create(name: string): Workspace {
    return this.repo.create(name);
  }

  async clone(name: string, repoUrl: string, authToken?: string): Promise<Workspace> {
    const id = `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const targetPath = path.join(this.repo.getWorkspacesDir(), id);
    await git.cloneRepo(repoUrl, targetPath, authToken);
    return this.repo.open(name, targetPath);
  }

  open(name: string, workspacePath: string): Workspace {
    return this.repo.open(name, workspacePath);
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
