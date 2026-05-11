import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import simpleGit from 'simple-git';
import {
  commitWorkspace,
  initRepo,
  ensureGitignore,
  isGitRepo,
  isGitRepoRoot,
  getCurrentBranch,
} from '../../utils/git';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeTempDir(): Promise<string> {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'requesto-git-test-'));
}

function removeTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

/** Bootstrap a git repo with a user identity so commits work in CI. */
async function bootstrapRepo(dir: string): Promise<ReturnType<typeof simpleGit>> {
  const git = simpleGit(dir);
  await git.init();
  await git.addConfig('user.email', 'test@requesto.test');
  await git.addConfig('user.name', 'Requesto Test');
  return git;
}

/** Write a file relative to `dir`. */
function writeFile(dir: string, rel: string, content = 'data'): void {
  const abs = path.join(dir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf-8');
}

/** Read the list of files changed in the latest commit. */
async function getLastCommitFiles(gitDir: string): Promise<string[]> {
  const git = simpleGit(gitDir);
  const result = await git.raw(['diff-tree', '--no-commit-id', '-r', '--name-only', 'HEAD']);
  return result
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// commitWorkspace — staging scope
// ---------------------------------------------------------------------------

describe('commitWorkspace', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await makeTempDir();
    const git = await bootstrapRepo(dir);

    // Create an initial empty commit so HEAD exists
    await git.commit('initial', { '--allow-empty': null });
  });

  afterEach(() => removeTempDir(dir));

  it('stages only Requesto data files, not other project files', async () => {
    // Requesto files
    writeFile(dir, 'collections.json', '[]');
    writeFile(dir, 'environments.json', '[]');
    writeFile(dir, 'oauth-configs.json', '[]');
    writeFile(dir, '.requesto/.gitignore', '# local\nlocal/\n');

    // Non-Requesto project files that should NOT be staged
    writeFile(dir, 'src/index.ts', 'console.log("hello")');
    writeFile(dir, 'README.md', '# My Project');
    writeFile(dir, 'package.json', '{}');

    await commitWorkspace(dir, 'sync requesto data');

    const committed = await getLastCommitFiles(dir);

    // Requesto files present
    expect(committed).toContain('collections.json');
    expect(committed).toContain('environments.json');
    expect(committed).toContain('oauth-configs.json');
    expect(committed).toContain('.requesto/.gitignore');

    // Non-Requesto files absent
    expect(committed).not.toContain('src/index.ts');
    expect(committed).not.toContain('README.md');
    expect(committed).not.toContain('package.json');
  });

  it('does not commit files inside .requesto/local/ (gitignored)', async () => {
    writeFile(dir, 'collections.json', '[]');
    writeFile(dir, '.requesto/.gitignore', '# local\nlocal/\n');
    writeFile(dir, '.requesto/local/history.json', '[]');
    writeFile(dir, '.requesto/local/oauth-secrets.json', '{}');

    // Stage the .gitignore first so git knows to ignore local/
    const git = simpleGit(dir);
    await git.add('.requesto/.gitignore');
    await git.commit('add gitignore');

    await commitWorkspace(dir, 'sync requesto data');

    const committed = await getLastCommitFiles(dir);

    expect(committed).toContain('collections.json');
    expect(committed).not.toContain('.requesto/local/history.json');
    expect(committed).not.toContain('.requesto/local/oauth-secrets.json');
  });

  it('works when only some Requesto files exist', async () => {
    // Only collections.json — no environments or oauth-configs
    writeFile(dir, 'collections.json', '[{"id":"col-1"}]');

    await commitWorkspace(dir, 'collections only');

    const committed = await getLastCommitFiles(dir);
    expect(committed).toContain('collections.json');
    expect(committed).not.toContain('environments.json');
  });

  it('throws when no Requesto files exist at all', async () => {
    writeFile(dir, 'src/main.ts', 'export {}');

    await expect(commitWorkspace(dir, 'nothing to commit')).rejects.toThrow(
      'No Requesto data files found to stage',
    );
  });

  it('works inside a monorepo (workspace is a subdirectory of the repo)', async () => {
    // Set up: workspace lives at <repo>/workspaces/my-ws/
    const workspacePath = path.join(dir, 'workspaces', 'my-ws');
    fs.mkdirSync(workspacePath, { recursive: true });

    writeFile(workspacePath, 'collections.json', '[]');
    writeFile(workspacePath, 'environments.json', '[]');

    // Also add a root-level file that should NOT be staged
    writeFile(dir, 'root-readme.md', '# Monorepo');

    await commitWorkspace(workspacePath, 'sync workspace in monorepo');

    const committed = await getLastCommitFiles(dir);

    expect(committed).toContain('workspaces/my-ws/collections.json');
    expect(committed).toContain('workspaces/my-ws/environments.json');
    expect(committed).not.toContain('root-readme.md');
  });
});

// ---------------------------------------------------------------------------
// initRepo + ensureGitignore
// ---------------------------------------------------------------------------

describe('initRepo', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await makeTempDir();
  });

  afterEach(() => removeTempDir(dir));

  it('initializes a git repo', async () => {
    await initRepo(dir);
    expect(await isGitRepo(dir)).toBe(true);
  });

  it('creates .requesto/.gitignore ignoring local/', async () => {
    await initRepo(dir);
    const gitignorePath = path.join(dir, '.requesto', '.gitignore');
    expect(fs.existsSync(gitignorePath)).toBe(true);
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    expect(content).toContain('local/');
  });
});

describe('ensureGitignore', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await makeTempDir();
  });

  afterEach(() => removeTempDir(dir));

  it('creates .requesto/.gitignore if it does not exist', async () => {
    await ensureGitignore(dir);
    const p = path.join(dir, '.requesto', '.gitignore');
    expect(fs.existsSync(p)).toBe(true);
    expect(fs.readFileSync(p, 'utf-8')).toContain('local/');
  });

  it('does not duplicate local/ if .gitignore already exists with the entry', async () => {
    fs.mkdirSync(path.join(dir, '.requesto'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.requesto', '.gitignore'), '# Requesto local data (history, secrets)\nlocal/\n');

    await ensureGitignore(dir);

    const content = fs.readFileSync(path.join(dir, '.requesto', '.gitignore'), 'utf-8');
    const matches = content.split('\n').filter((l) => l.trim() === 'local/');
    expect(matches).toHaveLength(1);
  });

  it('appends local/ if .gitignore exists but lacks the entry', async () => {
    fs.mkdirSync(path.join(dir, '.requesto'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.requesto', '.gitignore'), '# existing\n');

    await ensureGitignore(dir);

    const content = fs.readFileSync(path.join(dir, '.requesto', '.gitignore'), 'utf-8');
    expect(content).toContain('local/');
  });
});

// ---------------------------------------------------------------------------
// isGitRepoRoot
// ---------------------------------------------------------------------------

describe('isGitRepoRoot', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await makeTempDir();
  });

  afterEach(() => removeTempDir(dir));

  it('returns true for the repo root', async () => {
    await bootstrapRepo(dir);
    expect(await isGitRepoRoot(dir)).toBe(true);
  });

  it('returns false for a subdirectory of the repo', async () => {
    await bootstrapRepo(dir);
    const sub = path.join(dir, 'sub');
    fs.mkdirSync(sub);
    expect(await isGitRepoRoot(sub)).toBe(false);
  });

  it('returns false for a directory that is not a git repo', async () => {
    expect(await isGitRepoRoot(dir)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getCurrentBranch
// ---------------------------------------------------------------------------

describe('getCurrentBranch', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await makeTempDir();
  });

  afterEach(() => removeTempDir(dir));

  it('returns the branch name after init (unborn branch)', async () => {
    await bootstrapRepo(dir);
    const branch = await getCurrentBranch(dir);
    // Modern git defaults to 'main' or 'master' depending on config
    expect(typeof branch).toBe('string');
    expect(branch!.length).toBeGreaterThan(0);
  });

  it('reflects the branch after first commit', async () => {
    const git = await bootstrapRepo(dir);
    await git.commit('initial', { '--allow-empty': null });
    const branch = await getCurrentBranch(dir);
    expect(branch).toBeTruthy();
  });
});
