import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRunnerIsolation } from '../../../helpers/runner/isolation';

const fetchMock = vi.fn();

describe('createRunnerIsolation', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  function jsonResponse(payload: unknown, status = 200) {
    return {
      ok: status < 400,
      status,
      text: () => Promise.resolve(JSON.stringify(payload)),
      json: () => Promise.resolve(payload),
    };
  }

  it('captures the active workspace, creates and activates a scratch workspace', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: 'ws-1', name: 'Mine' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'ws-run', name: 'run', path: '/data/ws-run' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'ws-run' }));

    const isolation = createRunnerIsolation();
    await isolation.setup();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toContain('/workspaces/active');
    expect(fetchMock.mock.calls[1][0]).toContain('/workspaces');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).name).toMatch(/^requesto-run-/);
    expect(fetchMock.mock.calls[2][0]).toContain('/workspaces/ws-run/activate');
  });

  it('continues when there is no active workspace (404)', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: 'No active workspace' }, 404))
      .mockResolvedValueOnce(jsonResponse({ id: 'ws-run' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'ws-run' }));

    const isolation = createRunnerIsolation();
    await expect(isolation.setup()).resolves.toBeUndefined();
  });

  it('restores the original workspace and deletes the scratch one', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: 'ws-1' })) // setup: active
      .mockResolvedValueOnce(jsonResponse({ id: 'ws-run' })) // setup: create
      .mockResolvedValueOnce(jsonResponse({ id: 'ws-run' })) // setup: activate
      .mockResolvedValueOnce(jsonResponse({ id: 'ws-1' })) // teardown: restore
      .mockResolvedValueOnce(jsonResponse({ success: true })); // teardown: delete

    const isolation = createRunnerIsolation();
    await isolation.setup();
    await isolation.teardown();

    expect(fetchMock.mock.calls[3][0]).toContain('/workspaces/ws-1/activate');
    expect(fetchMock.mock.calls[4]).toEqual([expect.stringContaining('/workspaces/ws-run'), { method: 'DELETE' }]);
  });

  it('reports teardown problems from both restore and delete', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: 'ws-1' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'ws-run' }))
      .mockResolvedValueOnce(jsonResponse({ id: 'ws-run' }))
      .mockResolvedValueOnce(jsonResponse({ error: 'x' }, 500))
      .mockResolvedValueOnce(jsonResponse({ error: 'y' }, 500));

    const isolation = createRunnerIsolation();
    await isolation.setup();

    await expect(isolation.teardown()).rejects.toThrow(/restoring workspace[\s\S]*deleting scratch workspace/);
  });

  it('setup failures surface a descriptive error', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: 'ws-1' }))
      .mockResolvedValueOnce(jsonResponse({ error: 'disk full' }, 500));

    const isolation = createRunnerIsolation();
    await expect(isolation.setup()).rejects.toThrow(/failed \(500\)/);
  });
});
