import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWorkspaceStore } from '../../store/workspace/store';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockWorkspace = {
  id: 'ws-1',
  name: 'Test Workspace',
  path: '/data/workspaces/ws-1',
};

const mockRegistry = {
  activeWorkspaceId: 'ws-1',
  workspaces: [mockWorkspace],
};

describe('workspace store', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      registry: { activeWorkspaceId: '', workspaces: [] },
      loading: false,
    });
    mockFetch.mockReset();
  });

  it('starts with empty registry', () => {
    const state = useWorkspaceStore.getState();
    expect(state.registry.workspaces).toEqual([]);
    expect(state.registry.activeWorkspaceId).toBe('');
    expect(state.loading).toBe(false);
  });

  it('loads workspaces from API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockRegistry),
    });

    await useWorkspaceStore.getState().loadWorkspaces();

    const state = useWorkspaceStore.getState();
    expect(state.registry.workspaces).toEqual([mockWorkspace]);
    expect(state.registry.activeWorkspaceId).toBe('ws-1');
    expect(state.loading).toBe(false);
  });

  it('sets loading true while fetching workspaces', async () => {
    let resolvePromise: (value: unknown) => void;
    const pending = new Promise((resolve) => { resolvePromise = resolve; });

    mockFetch.mockReturnValueOnce(pending);

    const loadPromise = useWorkspaceStore.getState().loadWorkspaces();
    expect(useWorkspaceStore.getState().loading).toBe(true);

    resolvePromise!({ ok: true, json: () => Promise.resolve(mockRegistry) });
    await loadPromise;
    expect(useWorkspaceStore.getState().loading).toBe(false);
  });

  it('handles load failure gracefully', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await useWorkspaceStore.getState().loadWorkspaces();

    expect(useWorkspaceStore.getState().registry.workspaces).toEqual([]);
    expect(useWorkspaceStore.getState().loading).toBe(false);
  });

  it('creates a workspace via API', async () => {
    const newWorkspace = { ...mockWorkspace, id: 'ws-2', name: 'New Workspace' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(newWorkspace),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ activeWorkspaceId: 'ws-1', workspaces: [mockWorkspace, newWorkspace] }),
    });

    const result = await useWorkspaceStore.getState().createWorkspace({ name: 'New Workspace' });

    expect(result).toEqual(newWorkspace);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ name: 'New Workspace' }),
    });
  });

  it('throws on create failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Name taken' }),
    });

    await expect(
      useWorkspaceStore.getState().createWorkspace({ name: 'Duplicate' }),
    ).rejects.toThrow('Name taken');
  });

  it('clones a workspace from git repo', async () => {
    const clonedWorkspace = { ...mockWorkspace, id: 'ws-3', name: 'Cloned' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(clonedWorkspace),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ activeWorkspaceId: 'ws-1', workspaces: [mockWorkspace, clonedWorkspace] }),
    });

    const result = await useWorkspaceStore.getState().cloneWorkspace({
      name: 'Cloned',
      repoUrl: 'https://github.com/user/repo.git',
      authToken: 'token123',
    });

    expect(result).toEqual(clonedWorkspace);
    expect(mockFetch.mock.calls[0][0]).toContain('/workspaces/clone');
    expect(mockFetch.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ name: 'Cloned', repoUrl: 'https://github.com/user/repo.git', authToken: 'token123' }),
    });
  });

  it('throws on clone failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Clone failed: invalid URL' }),
    });

    await expect(
      useWorkspaceStore.getState().cloneWorkspace({ name: 'Bad', repoUrl: 'bad-url' }),
    ).rejects.toThrow('Clone failed: invalid URL');
  });

  it('updates a workspace via API', async () => {
    const updated = { ...mockWorkspace, name: 'Renamed' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(updated),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ activeWorkspaceId: 'ws-1', workspaces: [updated] }),
    });

    const result = await useWorkspaceStore.getState().updateWorkspace('ws-1', { name: 'Renamed' });

    expect(result).toEqual(updated);
    expect(mockFetch.mock.calls[0][0]).toContain('/workspaces/ws-1');
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'PUT' });
  });

  it('deletes a workspace via API', async () => {
    useWorkspaceStore.setState({
      registry: { activeWorkspaceId: 'ws-1', workspaces: [mockWorkspace, { ...mockWorkspace, id: 'ws-2', name: 'Second' }] },
      loading: false,
    });

    mockFetch.mockResolvedValueOnce({ ok: true });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ activeWorkspaceId: 'ws-1', workspaces: [mockWorkspace] }),
    });

    await useWorkspaceStore.getState().deleteWorkspace('ws-2');

    expect(mockFetch.mock.calls[0][0]).toContain('/workspaces/ws-2');
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
  });

  it('throws on delete failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Cannot delete active workspace' }),
    });

    await expect(
      useWorkspaceStore.getState().deleteWorkspace('ws-1'),
    ).rejects.toThrow('Cannot delete active workspace');
  });

  it('switches workspace via activate API', async () => {
    const ws2 = { ...mockWorkspace, id: 'ws-2', name: 'Second' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(ws2),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ activeWorkspaceId: 'ws-2', workspaces: [mockWorkspace, ws2] }),
    });

    const result = await useWorkspaceStore.getState().switchWorkspace('ws-2');

    expect(result).toEqual(ws2);
    expect(mockFetch.mock.calls[0][0]).toContain('/workspaces/ws-2/activate');
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  });

  it('opens an existing workspace via API', async () => {
    const opened = { ...mockWorkspace, id: 'ws-ext', name: 'External', path: '/external/path' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(opened),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ activeWorkspaceId: 'ws-1', workspaces: [mockWorkspace, opened] }),
    });

    const result = await useWorkspaceStore.getState().openWorkspace({ name: 'External', path: '/external/path' });

    expect(result).toEqual(opened);
    expect(mockFetch.mock.calls[0][0]).toContain('/workspaces/open');
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  });

  it('exports a workspace by downloading JSON', async () => {
    const exportData = { name: 'Test Workspace', collections: [], environments: [] };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(exportData),
    });

    const mockClick = vi.fn();
    const mockCreateElement = vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: mockClick,
    } as unknown as HTMLElement);
    const mockCreateObjectURL = vi.fn().mockReturnValue('blob:url');
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    await useWorkspaceStore.getState().exportWorkspace('ws-1');

    expect(mockFetch.mock.calls[0][0]).toContain('/workspaces/ws-1/export');
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:url');

    mockCreateElement.mockRestore();
  });

  it('imports a workspace from file', async () => {
    const imported = { ...mockWorkspace, id: 'ws-imp', name: 'Imported' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(imported),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ activeWorkspaceId: 'ws-1', workspaces: [mockWorkspace, imported] }),
    });

    const file = new File(
      [JSON.stringify({ name: 'Imported', collections: [] })],
      'workspace.json',
      { type: 'application/json' },
    );

    const result = await useWorkspaceStore.getState().importWorkspace(file);

    expect(result).toEqual(imported);
    expect(mockFetch.mock.calls[0][0]).toContain('/workspaces/import');
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  });
});
