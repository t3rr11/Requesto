import simpleGit, { type StatusResult, type LogResult, type DefaultLogFields } from 'simple-git';
import path from 'path';
import fs from 'fs';

const GITIGNORE_CONTENT = `# Requesto local data (history, secrets)
local/
`;

/**
 * Remove any Requesto-managed entries we previously added to the root .gitignore.
 */
function cleanRootGitignore(workspacePath: string): void {
  const rootGitignorePath = path.join(workspacePath, '.gitignore');
  if (!fs.existsSync(rootGitignorePath)) return;
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

/**
 * Check if git binary is available on the system.
 */
export async function isGitInstalled(): Promise<boolean> {
  try {
    const git = simpleGit();
    await git.version();
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a directory is inside a git repository.
 */
export async function isGitRepo(dirPath: string): Promise<boolean> {
  try {
    const git = simpleGit(dirPath);
    return await git.checkIsRepo();
  } catch {
    return false;
  }
}

/**
 * Check if the given directory IS the root of a git repository.
 * Returns false if the directory is merely inside a parent repo.
 */
export async function isGitRepoRoot(dirPath: string): Promise<boolean> {
  try {
    const git = simpleGit(dirPath);
    const isRepo = await git.checkIsRepo();
    if (!isRepo) return false;
    const root = (await git.revparse(['--show-toplevel'])).trim();
    return path.resolve(root) === path.resolve(dirPath);
  } catch {
    return false;
  }
}

/**
 * Get the root of the git repository containing the given directory.
 */
export async function getRepoRoot(dirPath: string): Promise<string | null> {
  try {
    const git = simpleGit(dirPath);
    const root = await git.revparse(['--show-toplevel']);
    return root.trim();
  } catch {
    return null;
  }
}

/**
 * Get the relative path from the repo root to the workspace directory.
 * Returns '.' if the workspace IS the repo root.
 */
export async function getRelativePath(dirPath: string): Promise<string> {
  const root = await getRepoRoot(dirPath);
  if (!root) return '.';
  const rel = path.relative(root, dirPath);
  return rel || '.';
}

/**
 * Get the current branch name.
 * For empty repos (no commits), reads the unborn branch name from HEAD.
 */
export async function getCurrentBranch(dirPath: string): Promise<string | null> {
  try {
    const git = simpleGit(dirPath);
    const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
    return branch.trim();
  } catch {
    // Empty repo — try to read the default branch from HEAD (e.g. "ref: refs/heads/main")
    try {
      const fs = await import('fs/promises');
      const headPath = path.join(dirPath, '.git', 'HEAD');
      const headContent = await fs.readFile(headPath, 'utf-8');
      const match = headContent.match(/^ref: refs\/heads\/(.+)$/m);
      if (match) return match[1].trim();
    } catch {
      // .git/HEAD not readable
    }
    return null;
  }
}

/**
 * Get git status for the workspace directory.
 * Scopes file paths to the workspace subdirectory (for monorepo support).
 */
export async function getStatus(workspacePath: string): Promise<StatusResult> {
  const repoRoot = await getRepoRoot(workspacePath);
  const gitDir = repoRoot || workspacePath;
  const git = simpleGit(gitDir);

  const relPath = repoRoot ? path.relative(repoRoot, workspacePath) : '.';

  if (relPath && relPath !== '.') {
    // Monorepo: scope status to workspace subdirectory
    return await git.status([relPath]);
  }
  return await git.status();
}

/**
 * Get ahead/behind counts relative to the tracking branch.
 * Returns zeros when no upstream is configured (local-only branch).
 */
export async function getAheadBehind(workspacePath: string): Promise<{ ahead: number; behind: number }> {
  try {
    const repoRoot = await getRepoRoot(workspacePath);
    const gitDir = repoRoot || workspacePath;
    const git = simpleGit(gitDir);
    const status = await git.status();

    // No tracking branch configured — local-only branch, nothing to compare against
    if (!status.tracking) {
      return { ahead: 0, behind: 0 };
    }

    // Tracking branch exists, verify the upstream ref actually resolves
    try {
      await git.raw(['rev-parse', '--verify', status.tracking]);
      // Upstream ref exists — use simple-git's ahead/behind
      return {
        ahead: status.ahead,
        behind: status.behind,
      };
    } catch {
      // Upstream ref configured but doesn't exist yet (e.g. remote is empty)
      return { ahead: 0, behind: 0 };
    }
  } catch {
    return { ahead: 0, behind: 0 };
  }
}

/**
 * Fetch from all remotes (silently ignores failures).
 */
export async function fetchRemotes(workspacePath: string): Promise<void> {
  try {
    const repoRoot = await getRepoRoot(workspacePath);
    const gitDir = repoRoot || workspacePath;
    const git = simpleGit(gitDir);
    await git.fetch();
  } catch {
    // Remote unreachable or no remotes configured — silently ignore
  }
}

/**
 * Initialize a new git repo in the given directory and create .gitignore.
 */
export async function initRepo(workspacePath: string): Promise<void> {
  const git = simpleGit(workspacePath);
  await git.init();
  await ensureGitignore(workspacePath);
}

/**
 * Ensure .requesto/.gitignore exists and ignores the local/ subdirectory.
 */
export async function ensureGitignore(workspacePath: string): Promise<void> {
  const requestoDir = path.join(workspacePath, '.requesto');
  if (!fs.existsSync(requestoDir)) {
    fs.mkdirSync(requestoDir, { recursive: true });
  }
  const gitignorePath = path.join(requestoDir, '.gitignore');

  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    if (!content.split('\n').some((line) => line.trim() === 'local/')) {
      fs.appendFileSync(gitignorePath, '\n' + GITIGNORE_CONTENT, 'utf-8');
    }
  } else {
    fs.writeFileSync(gitignorePath, GITIGNORE_CONTENT, 'utf-8');
  }

  // Remove any entries we previously wrote to the root .gitignore
  cleanRootGitignore(workspacePath);
}

/**
 * The Requesto-owned files that should be committed within a workspace directory.
 * Only these files are staged — any other project source code is left untouched.
 */
const REQUESTO_FILES = ['collections.json', 'environments.json', 'oauth-configs.json', '.requesto'];

/**
 * Stage only Requesto-owned files and commit.
 * This ensures that when Requesto operates inside an external/cloned repo,
 * it never stages the user's project source code.
 */
export async function commitWorkspace(
  workspacePath: string,
  message: string,
): Promise<string> {
  const repoRoot = await getRepoRoot(workspacePath);
  const gitDir = repoRoot || workspacePath;
  const git = simpleGit(gitDir);
  const relPath = repoRoot ? path.relative(repoRoot, workspacePath) : '.';

  // Build the list of Requesto files to stage, prefixed with the workspace
  // subdirectory when inside a monorepo. Only include paths that actually exist.
  const filesToStage = REQUESTO_FILES
    .map((f) => (relPath && relPath !== '.' ? path.join(relPath, f) : f))
    .filter((f) => fs.existsSync(path.join(gitDir, f)));

  if (filesToStage.length === 0) {
    throw new Error('No Requesto data files found to stage');
  }

  await git.add(filesToStage);

  const result = await git.commit(message);
  return result.commit;
}

/**
 * Push to remote.
 */
export async function push(workspacePath: string): Promise<void> {
  const repoRoot = await getRepoRoot(workspacePath);
  const gitDir = repoRoot || workspacePath;
  const git = simpleGit(gitDir);

  const branch = await getCurrentBranch(gitDir);
  if (!branch) throw new Error('No branch checked out');

  await git.push('origin', branch, ['--set-upstream']);
}

import type { PullResult, FileDiff } from '../models/git';
export type { PullResult, FileDiff };

/**
 * Get the diff for a specific file, or all changed files if no file is specified.
 * Shows unstaged + untracked changes relative to HEAD.
 */
export async function getDiff(workspacePath: string, filePath?: string): Promise<FileDiff[]> {
  const repoRoot = await getRepoRoot(workspacePath);
  const gitDir = repoRoot || workspacePath;
  const git = simpleGit(gitDir);
  const relPath = repoRoot ? path.relative(repoRoot, workspacePath) : '.';

  const results: FileDiff[] = [];

  if (filePath) {
    // Diff for a specific file
    const fullRelPath = relPath && relPath !== '.' ? path.join(relPath, filePath) : filePath;
    const status = await git.status();
    const fileStatus = status.files.find(f => f.path === fullRelPath || f.path === filePath);

    if (fileStatus && (fileStatus.index === '?' || fileStatus.working_dir === '?')) {
      // Untracked file — show full content as "added"
      const absPath = path.join(gitDir, fullRelPath);
      if (fs.existsSync(absPath)) {
        const content = fs.readFileSync(absPath, 'utf-8');
        const lines = content.split('\n').map((l) => `+${l}`).join('\n');
        results.push({ path: filePath, diff: `New file\n${lines}` });
      }
    } else {
      const diff = await git.diff([fullRelPath]);
      if (diff) {
        results.push({ path: filePath, diff });
      } else {
        // Try staged diff
        const stagedDiff = await git.diff(['--cached', fullRelPath]);
        if (stagedDiff) {
          results.push({ path: filePath, diff: stagedDiff });
        }
      }
    }
  } else {
    // Diff for all files within workspace scope
    const args = relPath && relPath !== '.' ? [relPath] : [];
    const diff = await git.diff(args);
    const stagedDiff = await git.diff(['--cached', ...args]);

    // Parse individual file diffs from combined output
    const combined = [diff, stagedDiff].filter(Boolean).join('\n');
    if (combined) {
      results.push({ path: '*', diff: combined });
    }

    // Also check for untracked files
    const status = await git.status();
    for (const f of status.files) {
      if (f.index === '?' || f.working_dir === '?') {
        const fileFull = path.join(gitDir, f.path);
        if (fs.existsSync(fileFull)) {
          const content = fs.readFileSync(fileFull, 'utf-8');
          const lines = content.split('\n').map(l => `+${l}`).join('\n');
          const displayPath = relPath && relPath !== '.' && f.path.startsWith(relPath)
            ? f.path.slice(relPath.length + 1)
            : f.path;
          results.push({ path: displayPath, diff: `New file\n${lines}` });
        }
      }
    }
  }

  return results;
}

/**
 * Pull from remote with auto-stash for uncommitted changes.
 * Detects and reports merge conflicts.
 */
export async function pull(workspacePath: string): Promise<PullResult> {
  const repoRoot = await getRepoRoot(workspacePath);
  const gitDir = repoRoot || workspacePath;
  const git = simpleGit(gitDir);

  // Check for any uncommitted changes (staged, unstaged, or untracked)
  const status = await git.status();
  const hasChanges = status.files.length > 0;
  let didStash = false;

  // Auto-stash all changes (including untracked files) before pulling
  if (hasChanges) {
    await git.stash(['push', '--include-untracked', '-m', 'requesto-auto-stash']);
    didStash = true;
  }

  try {
    await git.pull();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('no such ref was fetched')) {
      // Restore stash if we created one
      if (didStash) {
        try { await git.stash(['pop']); } catch { /* conflict on pop handled below */ }
      }
      throw new Error('Remote branch does not exist yet. Push your first commit to create it.');
    }
    // Pull itself failed (e.g. merge conflict during pull)
    // Check for conflicts
    const postStatus = await git.status();
    const conflicts = postStatus.conflicted;
    if (conflicts.length > 0) {
      // Abort the failed merge
      try { await git.raw(['merge', '--abort']); } catch { /* may not be in merge state */ }
      // Restore stash
      if (didStash) {
        try { await git.stash(['pop']); } catch { /* best effort */ }
      }
      return {
        success: false,
        hadStash: didStash,
        conflicts,
        message: `Pull resulted in conflicts in: ${conflicts.join(', ')}. Commit your changes and try again, or resolve the conflicts manually.`,
      };
    }
    // Restore stash on other failures
    if (didStash) {
      try { await git.stash(['pop']); } catch { /* best effort */ }
    }
    throw error;
  }

  // Pull succeeded — restore stashed changes
  if (didStash) {
    try {
      await git.stash(['pop']);
      // Verify no conflict markers were left behind
      const postStatus = await git.status();
      if (postStatus.conflicted.length > 0) {
        return {
          success: true,
          hadStash: true,
          conflicts: postStatus.conflicted,
          message: `Pulled successfully, but your local changes conflict with incoming changes in: ${postStatus.conflicted.join(', ')}. Use "Accept Incoming" or "Keep Local" to resolve.`,
        };
      }
    } catch {
      // Stash pop failed — could be conflicts or other issues
      // Check for conflict markers in working tree
      const postStatus = await git.status();
      const conflicted = postStatus.conflicted;
      if (conflicted.length > 0) {
        return {
          success: true,
          hadStash: true,
          conflicts: conflicted,
          message: `Pulled successfully, but your local changes conflict with incoming changes in: ${conflicted.join(', ')}. Use "Accept Incoming" or "Keep Local" to resolve.`,
        };
      }

      // Check if there are modified files with conflict markers (simple-git may not report them as conflicted)
      const modifiedFiles = postStatus.files
        .filter(f => f.working_dir === 'U' || f.index === 'U' ||
                     f.working_dir === 'A' && f.index === 'A' ||
                     f.working_dir === 'D' && f.index === 'D')
        .map(f => f.path);
      if (modifiedFiles.length > 0) {
        return {
          success: true,
          hadStash: true,
          conflicts: modifiedFiles,
          message: `Pulled successfully, but your local changes conflict with incoming changes in: ${modifiedFiles.join(', ')}. Use "Accept Incoming" or "Keep Local" to resolve.`,
        };
      }

      // Stash pop failed for unknown reason — the stash is still preserved
      // Try to restore clean state by resetting the conflicted files
      try {
        await git.checkout(['.']);
        // Stash is still in the list since pop failed, don't drop it
      } catch { /* best effort recovery */ }

      return {
        success: true,
        hadStash: true,
        conflicts: [],
        message: 'Pulled successfully, but could not restore your local changes. Your changes are preserved in git stash.',
      };
    }
  }

  return {
    success: true,
    hadStash: didStash,
    conflicts: [],
    message: didStash ? 'Pulled successfully (local changes were auto-stashed and restored).' : 'Pulled successfully.',
  };
}

/**
 * Resolve a merge conflict by accepting "ours" (local) or "theirs" (remote) version.
 */
export async function resolveConflict(
  workspacePath: string,
  filePath: string,
  strategy: 'ours' | 'theirs',
): Promise<void> {
  const repoRoot = await getRepoRoot(workspacePath);
  const gitDir = repoRoot || workspacePath;
  const git = simpleGit(gitDir);

  await git.raw(['checkout', `--${strategy}`, filePath]);
  await git.add([filePath]);
}

/**
 * Resolve all merge conflicts by accepting "ours" (local) or "theirs" (remote) for all files.
 */
export async function resolveAllConflicts(
  workspacePath: string,
  strategy: 'ours' | 'theirs',
): Promise<void> {
  const repoRoot = await getRepoRoot(workspacePath);
  const gitDir = repoRoot || workspacePath;
  const git = simpleGit(gitDir);

  const status = await git.status();
  for (const file of status.conflicted) {
    await git.raw(['checkout', `--${strategy}`, file]);
    await git.add([file]);
  }
}

/**
 * Get recent commit log.
 * Returns an empty log for repos with no commits.
 */
export async function getLog(
  workspacePath: string,
  maxCount = 20,
): Promise<LogResult<DefaultLogFields>> {
  const repoRoot = await getRepoRoot(workspacePath);
  const gitDir = repoRoot || workspacePath;
  const git = simpleGit(gitDir);
  const relPath = repoRoot ? path.relative(repoRoot, workspacePath) : '.';

  const options: Record<string, string | number | undefined> = {
    maxCount,
  };

  try {
    if (relPath && relPath !== '.') {
      // Scope log to workspace subdirectory
      return await git.log({ ...options, file: relPath });
    }

    return await git.log(options);
  } catch {
    // Empty repos (no commits) cause git log to fail — return empty result
    return { all: [], total: 0, latest: null } as unknown as LogResult<DefaultLogFields>;
  }
}

/**
 * List configured remotes.
 */
export async function getRemotes(workspacePath: string): Promise<Array<{ name: string; refs: { fetch: string; push: string } }>> {
  const repoRoot = await getRepoRoot(workspacePath);
  const gitDir = repoRoot || workspacePath;
  const git = simpleGit(gitDir);
  return await git.getRemotes(true);
}

/**
 * Clone a repository into a target directory.
 * If authToken is provided, it is embedded in the HTTPS URL for authentication.
 */
export async function cloneRepo(repoUrl: string, targetPath: string, authToken?: string): Promise<void> {
  let cloneUrl = repoUrl;

  if (authToken) {
    try {
      const parsed = new URL(repoUrl);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        parsed.username = encodeURIComponent(authToken);
        parsed.password = '';
        cloneUrl = parsed.toString();
      }
    } catch {
      // If URL parsing fails, proceed with the original URL
    }
  }

  const git = simpleGit();
  await git.clone(cloneUrl, targetPath);
  await ensureGitignore(targetPath);

  // After clone, reset the remote URL to the original (without embedded token)
  // so the token is not persisted in .git/config
  if (authToken && cloneUrl !== repoUrl) {
    const clonedGit = simpleGit(targetPath);
    await clonedGit.remote(['set-url', 'origin', repoUrl]);
  }
}

/**
 * Add a remote to the repo.
 */
export async function addRemote(workspacePath: string, name: string, url: string): Promise<void> {
  const repoRoot = await getRepoRoot(workspacePath);
  const gitDir = repoRoot || workspacePath;
  const git = simpleGit(gitDir);
  await git.addRemote(name, url);
}

/**
 * List all local and remote branches, along with the current branch.
 */
export async function listBranches(workspacePath: string): Promise<{
  local: string[];
  remote: string[];
  current: string | null;
}> {
  const repoRoot = await getRepoRoot(workspacePath);
  const gitDir = repoRoot || workspacePath;
  const git = simpleGit(gitDir);
  const current = await getCurrentBranch(gitDir);
  const summary = await git.branch(['-a']);
  const local = summary.branches
    ? Object.values(summary.branches)
        .filter((b) => !b.name.startsWith('remotes/'))
        .map((b) => b.name)
        .sort((a, b) => {
          if (a === current) return -1;
          if (b === current) return 1;
          const defaultBranches = ['main', 'master'];
          const aIsDefault = defaultBranches.includes(a);
          const bIsDefault = defaultBranches.includes(b);
          if (aIsDefault && !bIsDefault) return -1;
          if (bIsDefault && !aIsDefault) return 1;
          return a.localeCompare(b);
        })
    : [];
  const remote = summary.branches
    ? Object.values(summary.branches)
        .filter((b) => b.name.startsWith('remotes/'))
        .map((b) => b.name.replace(/^remotes\//, ''))
    : [];
  return { local, remote, current };
}

/**
 * Create a new local branch. Branches from the given `from` ref, or from the
 * current HEAD if `from` is omitted. Does not switch to the new branch.
 */
export async function createBranch(workspacePath: string, branchName: string, from?: string): Promise<void> {
  const repoRoot = await getRepoRoot(workspacePath);
  const gitDir = repoRoot || workspacePath;
  const git = simpleGit(gitDir);
  await git.branch(from ? [branchName, from] : [branchName]);
}

/**
 * Switch to a different branch.
 * Throws if there are uncommitted changes — user must commit or discard first.
 */
export async function checkoutBranch(workspacePath: string, branchName: string): Promise<void> {
  const repoRoot = await getRepoRoot(workspacePath);
  const gitDir = repoRoot || workspacePath;
  const git = simpleGit(gitDir);

  const status = await git.status();
  if (!status.isClean()) {
    throw new Error('Cannot switch branches with uncommitted changes. Please commit or discard your changes first.');
  }

  await git.checkout(branchName);
}

/**
 * Delete a local branch.
 * Use force=true to delete even if the branch has unmerged commits.
 */
export async function deleteBranch(workspacePath: string, branchName: string, force = false): Promise<void> {
  const repoRoot = await getRepoRoot(workspacePath);
  const gitDir = repoRoot || workspacePath;
  const git = simpleGit(gitDir);
  const flag = force ? '-D' : '-d';
  await git.branch([flag, branchName]);
}

/**
 * Rename a local branch.
 */
export async function renameBranch(workspacePath: string, oldName: string, newName: string): Promise<void> {
  const repoRoot = await getRepoRoot(workspacePath);
  const gitDir = repoRoot || workspacePath;
  const git = simpleGit(gitDir);
  await git.branch(['-m', oldName, newName]);
}
