import { FastifyInstance } from 'fastify';
import { getActiveWorkspace } from '../database/workspaces';
import * as git from '../helpers/gitHelpers';

export async function gitRoutes(server: FastifyInstance) {
  /**
   * GET /git/check — Check if git is installed and workspace is a repo.
   */
  server.get('/git/check', async () => {
    const workspace = getActiveWorkspace();
    const installed = await git.isGitInstalled();
    if (!installed) {
      return { installed: false, isRepo: false, branch: null, repoRoot: null };
    }
    const isRepo = await git.isGitRepoRoot(workspace.path);
    const branch = isRepo ? await git.getCurrentBranch(workspace.path) : null;
    return { installed, isRepo, branch };
  });

  /**
   * GET /git/status — Git status for the active workspace.
   */
  server.get('/git/status', async (_request, reply) => {
    const workspace = getActiveWorkspace();
    const isRepo = await git.isGitRepoRoot(workspace.path);
    if (!isRepo) {
      return reply.code(400).send({ error: 'Workspace is not a git repository' });
    }

    // Fetch from remotes to detect new upstream commits
    await git.fetchRemotes(workspace.path);

    const status = await git.getStatus(workspace.path);
    const aheadBehind = await git.getAheadBehind(workspace.path);
    const branch = await git.getCurrentBranch(workspace.path);

    return {
      branch,
      ahead: aheadBehind.ahead,
      behind: aheadBehind.behind,
      files: status.files.map(f => ({
        path: f.path,
        index: f.index,
        workingDir: f.working_dir,
      })),
      isClean: status.isClean(),
    };
  });

  /**
   * POST /git/init — Initialize a git repo in the active workspace.
   */
  server.post('/git/init', async (_request, reply) => {
    const workspace = getActiveWorkspace();
    const isRepo = await git.isGitRepo(workspace.path);
    if (isRepo) {
      return reply.code(400).send({ error: 'Workspace is already a git repository' });
    }

    await git.initRepo(workspace.path);
    const branch = await git.getCurrentBranch(workspace.path);
    return { success: true, branch };
  });

  /**
   * POST /git/commit — Stage workspace files and commit.
   */
  server.post<{ Body: { message: string } }>('/git/commit', async (request, reply) => {
    const { message } = request.body;
    if (!message || !message.trim()) {
      return reply.code(400).send({ error: 'Commit message is required' });
    }

    const workspace = getActiveWorkspace();
    const isRepo = await git.isGitRepoRoot(workspace.path);
    if (!isRepo) {
      return reply.code(400).send({ error: 'Workspace is not a git repository' });
    }

    try {
      const commitHash = await git.commitWorkspace(workspace.path, message.trim());
      return { success: true, commit: commitHash };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Commit failed';
      return reply.code(500).send({ error: msg });
    }
  });

  /**
   * POST /git/push — Push to remote.
   */
  server.post('/git/push', async (_request, reply) => {
    const workspace = getActiveWorkspace();
    const isRepo = await git.isGitRepoRoot(workspace.path);
    if (!isRepo) {
      return reply.code(400).send({ error: 'Workspace is not a git repository' });
    }

    try {
      await git.push(workspace.path);
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Push failed';
      return reply.code(500).send({ error: msg });
    }
  });

  /**
   * POST /git/pull — Pull from remote with auto-stash and conflict detection.
   */
  server.post('/git/pull', async (_request, reply) => {
    const workspace = getActiveWorkspace();
    const isRepo = await git.isGitRepoRoot(workspace.path);
    if (!isRepo) {
      return reply.code(400).send({ error: 'Workspace is not a git repository' });
    }

    try {
      const result = await git.pull(workspace.path);
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Pull failed';
      return reply.code(500).send({ error: msg });
    }
  });

  /**
   * POST /git/resolve — Resolve merge conflicts.
   */
  server.post<{ Body: { strategy: 'ours' | 'theirs'; file?: string } }>('/git/resolve', async (request, reply) => {
    const workspace = getActiveWorkspace();
    const isRepo = await git.isGitRepoRoot(workspace.path);
    if (!isRepo) {
      return reply.code(400).send({ error: 'Workspace is not a git repository' });
    }

    const { strategy, file } = request.body;
    if (!strategy || !['ours', 'theirs'].includes(strategy)) {
      return reply.code(400).send({ error: 'Strategy must be "ours" or "theirs"' });
    }

    try {
      if (file) {
        await git.resolveConflict(workspace.path, file, strategy);
      } else {
        await git.resolveAllConflicts(workspace.path, strategy);
      }
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to resolve conflicts';
      return reply.code(500).send({ error: msg });
    }
  });

  /**
   * GET /git/diff — Get diff for changed files.
   */
  server.get<{ Querystring: { file?: string } }>('/git/diff', async (request, reply) => {
    const workspace = getActiveWorkspace();
    const isRepo = await git.isGitRepoRoot(workspace.path);
    if (!isRepo) {
      return reply.code(400).send({ error: 'Workspace is not a git repository' });
    }

    try {
      const diffs = await git.getDiff(workspace.path, request.query.file);
      return { diffs };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to get diff';
      return reply.code(500).send({ error: msg });
    }
  });

  /**
   * GET /git/log — Recent commit history.
   */
  server.get<{ Querystring: { limit?: string } }>('/git/log', async (request, reply) => {
    const workspace = getActiveWorkspace();
    const isRepo = await git.isGitRepoRoot(workspace.path);
    if (!isRepo) {
      return reply.code(400).send({ error: 'Workspace is not a git repository' });
    }

    const limit = Math.min(parseInt(request.query.limit || '20', 10) || 20, 100);

    try {
      const log = await git.getLog(workspace.path, limit);

      return {
        commits: log.all.map(entry => ({
          hash: entry.hash,
          message: entry.message,
          author: entry.author_name,
          date: entry.date,
        })),
      };
    } catch {
      return { commits: [] };
    }
  });

  /**
   * GET /git/remotes — List configured remotes.
   */
  server.get('/git/remotes', async (_request, reply) => {
    const workspace = getActiveWorkspace();
    const isRepo = await git.isGitRepoRoot(workspace.path);
    if (!isRepo) {
      return reply.code(400).send({ error: 'Workspace is not a git repository' });
    }

    const remotes = await git.getRemotes(workspace.path);
    return {
      remotes: remotes.map(r => ({
        name: r.name,
        fetchUrl: r.refs.fetch,
        pushUrl: r.refs.push,
      })),
    };
  });

  /**
   * POST /git/remote — Add a remote.
   */
  server.post<{ Body: { name: string; url: string } }>('/git/remote', async (request, reply) => {
    const { name, url } = request.body;
    if (!name || !url) {
      return reply.code(400).send({ error: 'name and url are required' });
    }

    const workspace = getActiveWorkspace();
    const isRepo = await git.isGitRepoRoot(workspace.path);
    if (!isRepo) {
      return reply.code(400).send({ error: 'Workspace is not a git repository' });
    }

    try {
      await git.addRemote(workspace.path, name, url);
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to add remote';
      return reply.code(500).send({ error: msg });
    }
  });
}
