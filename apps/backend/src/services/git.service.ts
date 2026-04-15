import { WorkspaceService } from './workspace.service';
import { AppError } from '../errors/app-error';
import * as git from '../utils/git';

export class GitService {
  constructor(private readonly workspaceService: WorkspaceService) {}

  private getWorkspacePath(): string {
    return this.workspaceService.getActive().path;
  }

  async check(): Promise<{ installed: boolean; isRepo: boolean; branch: string | null; repoRoot: string | null }> {
    const workspacePath = this.getWorkspacePath();
    const installed = await git.isGitInstalled();
    if (!installed) {
      return { installed: false, isRepo: false, branch: null, repoRoot: null };
    }
    const isRepo = await git.isGitRepoRoot(workspacePath);
    const branch = isRepo ? await git.getCurrentBranch(workspacePath) : null;
    return { installed, isRepo, branch, repoRoot: isRepo ? workspacePath : null };
  }

  async getStatus(): Promise<{
    branch: string | null;
    ahead: number;
    behind: number;
    files: { path: string; index: string; workingDir: string }[];
    isClean: boolean;
  }> {
    const workspacePath = this.getWorkspacePath();
    const isRepo = await git.isGitRepoRoot(workspacePath);
    if (!isRepo) {
      throw AppError.badRequest('Workspace is not a git repository');
    }

    await git.fetchRemotes(workspacePath);
    const status = await git.getStatus(workspacePath);
    const aheadBehind = await git.getAheadBehind(workspacePath);
    const branch = await git.getCurrentBranch(workspacePath);

    return {
      branch,
      ahead: aheadBehind.ahead,
      behind: aheadBehind.behind,
      files: status.files.map((f) => ({ path: f.path, index: f.index, workingDir: f.working_dir })),
      isClean: status.isClean(),
    };
  }

  async init(): Promise<{ success: boolean; branch: string | null }> {
    const workspacePath = this.getWorkspacePath();
    const isRepo = await git.isGitRepo(workspacePath);
    if (isRepo) {
      throw AppError.badRequest('Workspace is already a git repository');
    }
    await git.initRepo(workspacePath);
    const branch = await git.getCurrentBranch(workspacePath);
    return { success: true, branch };
  }

  async commit(message: string): Promise<{ success: boolean; commit: string }> {
    const workspacePath = this.getWorkspacePath();
    const isRepo = await git.isGitRepoRoot(workspacePath);
    if (!isRepo) {
      throw AppError.badRequest('Workspace is not a git repository');
    }
    const commitHash = await git.commitWorkspace(workspacePath, message.trim());
    return { success: true, commit: commitHash };
  }

  async push(): Promise<{ success: boolean }> {
    const workspacePath = this.getWorkspacePath();
    const isRepo = await git.isGitRepoRoot(workspacePath);
    if (!isRepo) {
      throw AppError.badRequest('Workspace is not a git repository');
    }
    await git.push(workspacePath);
    return { success: true };
  }

  async pull(workspacePath?: string): Promise<unknown> {
    const path = workspacePath ?? this.getWorkspacePath();
    const isRepo = await git.isGitRepoRoot(path);
    if (!isRepo) {
      throw AppError.badRequest('Workspace is not a git repository');
    }
    return git.pull(path);
  }

  async resolve(strategy: 'ours' | 'theirs', file?: string): Promise<{ success: boolean }> {
    const workspacePath = this.getWorkspacePath();
    const isRepo = await git.isGitRepoRoot(workspacePath);
    if (!isRepo) {
      throw AppError.badRequest('Workspace is not a git repository');
    }
    if (file) {
      await git.resolveConflict(workspacePath, file, strategy);
    } else {
      await git.resolveAllConflicts(workspacePath, strategy);
    }
    return { success: true };
  }

  async getDiff(file?: string): Promise<{ diffs: unknown }> {
    const workspacePath = this.getWorkspacePath();
    const isRepo = await git.isGitRepoRoot(workspacePath);
    if (!isRepo) {
      throw AppError.badRequest('Workspace is not a git repository');
    }
    const diffs = await git.getDiff(workspacePath, file);
    return { diffs };
  }

  async getLog(limit: number): Promise<{
    commits: { hash: string; message: string; author: string; date: string }[];
  }> {
    const workspacePath = this.getWorkspacePath();
    const isRepo = await git.isGitRepoRoot(workspacePath);
    if (!isRepo) {
      throw AppError.badRequest('Workspace is not a git repository');
    }
    const log = await git.getLog(workspacePath, limit);
    return {
      commits: log.all.map((entry) => ({
        hash: entry.hash,
        message: entry.message,
        author: entry.author_name,
        date: entry.date,
      })),
    };
  }

  async addRemote(name: string, url: string): Promise<{ success: boolean }> {
    const workspacePath = this.getWorkspacePath();
    const isRepo = await git.isGitRepoRoot(workspacePath);
    if (!isRepo) {
      throw AppError.badRequest('Workspace is not a git repository');
    }
    await git.addRemote(workspacePath, name, url);
    return { success: true };
  }

  async getRemotes(): Promise<unknown[]> {
    const workspacePath = this.getWorkspacePath();
    const isRepo = await git.isGitRepoRoot(workspacePath);
    if (!isRepo) {
      throw AppError.badRequest('Workspace is not a git repository');
    }
    return git.getRemotes(workspacePath);
  }
}
