import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGitStore } from '../../store/git/store';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockStatus = {
  branch: 'main',
  ahead: 0,
  behind: 0,
  files: [],
  isClean: true,
};

const mockLogEntry = {
  hash: 'abc123',
  message: 'Initial commit',
  author: 'dev',
  date: '2024-01-15T10:00:00Z',
};

const mockRemote = {
  name: 'origin',
  fetchUrl: 'https://github.com/user/repo.git',
  pushUrl: 'https://github.com/user/repo.git',
};

describe('git store', () => {
  beforeEach(() => {
    useGitStore.setState({
      isGitInstalled: false,
      isRepo: false,
      branch: null,
      status: null,
      log: [],
      remotes: [],
      conflicts: [],
      diffs: [],
      statusLoading: false,
      operating: false,
      pushing: false,
      pulling: false,
      diffLoading: false,
    });
    mockFetch.mockReset();
  });

  it('starts with default state', () => {
    const state = useGitStore.getState();
    expect(state.isGitInstalled).toBe(false);
    expect(state.isRepo).toBe(false);
    expect(state.branch).toBeNull();
    expect(state.status).toBeNull();
    expect(state.log).toEqual([]);
    expect(state.remotes).toEqual([]);
    expect(state.conflicts).toEqual([]);
    expect(state.diffs).toEqual([]);
  });

  describe('checkGit', () => {
    it('sets git installed and repo status when available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ installed: true, isRepo: true, branch: 'main' }),
      });

      await useGitStore.getState().checkGit();

      const state = useGitStore.getState();
      expect(state.isGitInstalled).toBe(true);
      expect(state.isRepo).toBe(true);
      expect(state.branch).toBe('main');
    });

    it('sets false when git is not installed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ installed: false, isRepo: false, branch: null }),
      });

      await useGitStore.getState().checkGit();

      expect(useGitStore.getState().isGitInstalled).toBe(false);
      expect(useGitStore.getState().isRepo).toBe(false);
    });

    it('handles check failure gracefully', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      await useGitStore.getState().checkGit();

      expect(useGitStore.getState().isGitInstalled).toBe(false);
      expect(useGitStore.getState().isRepo).toBe(false);
      expect(useGitStore.getState().branch).toBeNull();
    });
  });

  describe('loadStatus', () => {
    it('loads git status from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatus),
      });

      await useGitStore.getState().loadStatus();

      const state = useGitStore.getState();
      expect(state.status).toEqual(mockStatus);
      expect(state.branch).toBe('main');
      expect(state.statusLoading).toBe(false);
    });

    it('sets statusLoading during fetch', async () => {
      let resolvePromise: (v: unknown) => void;
      const pending = new Promise((r) => { resolvePromise = r; });
      mockFetch.mockReturnValueOnce(pending);

      const loadPromise = useGitStore.getState().loadStatus();
      expect(useGitStore.getState().statusLoading).toBe(true);

      resolvePromise!({ ok: true, json: () => Promise.resolve(mockStatus) });
      await loadPromise;
      expect(useGitStore.getState().statusLoading).toBe(false);
    });

    it('handles status failure gracefully', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      await useGitStore.getState().loadStatus();

      expect(useGitStore.getState().statusLoading).toBe(false);
    });

    it('reports dirty status with changed files', async () => {
      const dirtyStatus = {
        ...mockStatus,
        isClean: false,
        files: [{ path: 'collections.json', index: 'M', workingDir: ' ' }],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(dirtyStatus),
      });

      await useGitStore.getState().loadStatus();

      expect(useGitStore.getState().status?.isClean).toBe(false);
      expect(useGitStore.getState().status?.files).toHaveLength(1);
    });
  });

  describe('loadLog', () => {
    it('loads commit log from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ commits: [mockLogEntry] }),
      });

      await useGitStore.getState().loadLog();

      expect(useGitStore.getState().log).toEqual([mockLogEntry]);
    });

    it('handles log failure gracefully', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      await useGitStore.getState().loadLog();

      expect(useGitStore.getState().log).toEqual([]);
    });
  });

  describe('loadRemotes', () => {
    it('loads remotes from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ remotes: [mockRemote] }),
      });

      await useGitStore.getState().loadRemotes();

      expect(useGitStore.getState().remotes).toEqual([mockRemote]);
    });

    it('handles remotes failure gracefully', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      await useGitStore.getState().loadRemotes();

      expect(useGitStore.getState().remotes).toEqual([]);
    });
  });

  describe('initRepo', () => {
    it('initializes a new git repo', async () => {
      // initRepoApi
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, branch: 'main' }),
      });
      // loadStatus (called after init)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatus),
      });

      await useGitStore.getState().initRepo();

      const state = useGitStore.getState();
      expect(state.isRepo).toBe(true);
      expect(state.branch).toBe('main');
      expect(state.operating).toBe(false);
    });

    it('throws on init failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Init failed' }),
      });

      await expect(useGitStore.getState().initRepo()).rejects.toThrow('Init failed');
      expect(useGitStore.getState().operating).toBe(false);
    });
  });

  describe('commit', () => {
    it('commits with message and refreshes status/log', async () => {
      // commitApi
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, commit: 'def456' }),
      });
      // loadStatus
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatus),
      });
      // loadLog
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ commits: [mockLogEntry] }),
      });

      const hash = await useGitStore.getState().commit('test commit');

      expect(hash).toBe('def456');
      expect(useGitStore.getState().operating).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('sends correct commit payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, commit: 'abc' }),
      });
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStatus) });
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ commits: [] }) });

      await useGitStore.getState().commit('my message');

      expect(mockFetch.mock.calls[0][1]).toMatchObject({
        method: 'POST',
        body: JSON.stringify({ message: 'my message' }),
      });
    });

    it('throws on commit failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Nothing to commit' }),
      });

      await expect(useGitStore.getState().commit('empty')).rejects.toThrow('Nothing to commit');
      expect(useGitStore.getState().operating).toBe(false);
    });
  });

  describe('push', () => {
    it('pushes and refreshes status', async () => {
      // pushApi
      mockFetch.mockResolvedValueOnce({ ok: true });
      // loadStatus
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatus),
      });

      await useGitStore.getState().push();

      expect(useGitStore.getState().pushing).toBe(false);
      expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'POST' });
    });

    it('throws on push failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'No remote' }),
      });

      await expect(useGitStore.getState().push()).rejects.toThrow('No remote');
      expect(useGitStore.getState().pushing).toBe(false);
    });
  });

  describe('pull', () => {
    it('pulls and refreshes status/log', async () => {
      const pullResult = { success: true, hadStash: false, conflicts: [], message: 'Already up to date' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(pullResult),
      });
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStatus) });
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ commits: [] }) });

      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      const result = await useGitStore.getState().pull();

      expect(result).toEqual(pullResult);
      expect(useGitStore.getState().pulling).toBe(false);
      expect(useGitStore.getState().conflicts).toEqual([]);
      expect(dispatchSpy).toHaveBeenCalledWith(expect.any(Event));
      dispatchSpy.mockRestore();
    });

    it('sets conflicts when pull has merge conflicts', async () => {
      const pullResult = { success: false, hadStash: false, conflicts: ['collections.json'], message: 'Conflicts' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(pullResult),
      });
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStatus) });
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ commits: [] }) });

      const result = await useGitStore.getState().pull();

      expect(result.conflicts).toEqual(['collections.json']);
      expect(useGitStore.getState().conflicts).toEqual(['collections.json']);
    });

    it('throws on pull failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Pull failed' }),
      });

      await expect(useGitStore.getState().pull()).rejects.toThrow('Pull failed');
      expect(useGitStore.getState().pulling).toBe(false);
    });
  });

  describe('resolveConflicts', () => {
    it('resolves conflicts with ours strategy', async () => {
      useGitStore.setState({ conflicts: ['file.json'] });

      mockFetch.mockResolvedValueOnce({ ok: true });
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStatus) });

      await useGitStore.getState().resolveConflicts('ours');

      expect(useGitStore.getState().conflicts).toEqual([]);
      expect(mockFetch.mock.calls[0][1]).toMatchObject({
        method: 'POST',
        body: JSON.stringify({ strategy: 'ours' }),
      });
    });

    it('resolves conflicts for specific file', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStatus) });

      await useGitStore.getState().resolveConflicts('theirs', 'collections.json');

      expect(mockFetch.mock.calls[0][1]).toMatchObject({
        body: JSON.stringify({ strategy: 'theirs', file: 'collections.json' }),
      });
    });

    it('throws on resolve failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Cannot resolve' }),
      });

      await expect(
        useGitStore.getState().resolveConflicts('ours'),
      ).rejects.toThrow('Cannot resolve');
      expect(useGitStore.getState().operating).toBe(false);
    });
  });

  describe('loadDiff', () => {
    it('loads diffs from API', async () => {
      const diffs = [{ path: 'collections.json', diff: '+ new line' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ diffs }),
      });

      const result = await useGitStore.getState().loadDiff();

      expect(result).toEqual(diffs);
      expect(useGitStore.getState().diffs).toEqual(diffs);
      expect(useGitStore.getState().diffLoading).toBe(false);
    });

    it('loads diff for specific file', async () => {
      const diffs = [{ path: 'env.json', diff: '- old\n+ new' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ diffs }),
      });

      await useGitStore.getState().loadDiff('env.json');

      expect(mockFetch.mock.calls[0][0]).toContain('?file=env.json');
    });

    it('returns empty on diff failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const result = await useGitStore.getState().loadDiff();

      expect(result).toEqual([]);
      expect(useGitStore.getState().diffs).toEqual([]);
      expect(useGitStore.getState().diffLoading).toBe(false);
    });
  });

  describe('addRemote', () => {
    it('adds a remote and refreshes remotes list', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ remotes: [mockRemote] }),
      });

      await useGitStore.getState().addRemote('origin', 'https://github.com/user/repo.git');

      expect(mockFetch.mock.calls[0][1]).toMatchObject({
        method: 'POST',
        body: JSON.stringify({ name: 'origin', url: 'https://github.com/user/repo.git' }),
      });
      expect(useGitStore.getState().remotes).toEqual([mockRemote]);
      expect(useGitStore.getState().operating).toBe(false);
    });

    it('throws on addRemote failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Remote already exists' }),
      });

      await expect(
        useGitStore.getState().addRemote('origin', 'url'),
      ).rejects.toThrow('Remote already exists');
      expect(useGitStore.getState().operating).toBe(false);
    });
  });

  describe('reset', () => {
    it('resets repo-related state', () => {
      useGitStore.setState({
        isRepo: true,
        branch: 'main',
        status: mockStatus,
        log: [mockLogEntry],
        remotes: [mockRemote],
        conflicts: ['file.json'],
      });

      useGitStore.getState().reset();

      const state = useGitStore.getState();
      expect(state.isRepo).toBe(false);
      expect(state.branch).toBeNull();
      expect(state.status).toBeNull();
      expect(state.log).toEqual([]);
      expect(state.remotes).toEqual([]);
      expect(state.conflicts).toEqual([]);
    });
  });
});
