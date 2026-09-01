import http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { ScratchWorkspaceIsolation } from '../src/isolation/scratch-workspace.ts';

type Call = { method: string; url: string; body?: unknown };

let server: http.Server;
let baseUrl = '';
let calls: Call[] = [];

function json(res: http.ServerResponse, payload: unknown, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      let body: unknown;
      try { body = raw ? JSON.parse(raw) : undefined; } catch { body = raw; }
      calls.push({ method: req.method ?? '', url: url.pathname, body });

      if (url.pathname === '/api/workspaces/active' && req.method === 'GET') {
        return json(res, { id: 'ws-original', name: 'Original', path: '/data/ws-original' });
      }
      if (url.pathname === '/api/workspaces' && req.method === 'POST') {
        return json(res, { id: 'ws-scratch', name: 'scratch', path: '/data/ws-scratch' });
      }
      if (url.pathname === '/api/workspaces/ws-scratch/activate' && req.method === 'POST') {
        return json(res, { id: 'ws-scratch', name: 'scratch', path: '/data/ws-scratch' });
      }
      if (url.pathname === '/api/workspaces/ws-original/activate' && req.method === 'POST') {
        return json(res, { id: 'ws-original', name: 'Original', path: '/data/ws-original' });
      }
      if (url.pathname === '/api/workspaces/ws-scratch' && req.method === 'DELETE') {
        return json(res, { success: true });
      }
      if (url.pathname === '/api/workspaces/fail-delete' && req.method === 'DELETE') {
        return json(res, { error: 'boom' }, 500);
      }
      json(res, { error: 'not found' }, 404);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server?.close();
});

describe('ScratchWorkspaceIsolation', () => {
  it('captures the active workspace, creates and activates a scratch one, then restores and deletes', async () => {
    calls = [];
    const isolation = new ScratchWorkspaceIsolation({ serverUrl: baseUrl });

    await isolation.setup();
    await isolation.teardown();

    expect(calls.map(({ method, url }) => ({ method, url }))).toEqual([
      { method: 'GET', url: '/api/workspaces/active' },
      { method: 'POST', url: '/api/workspaces' },
      { method: 'POST', url: '/api/workspaces/ws-scratch/activate' },
      { method: 'POST', url: '/api/workspaces/ws-original/activate' },
      { method: 'DELETE', url: '/api/workspaces/ws-scratch' },
    ]);
    // The scratch workspace inherits the source workspace's execution context.
    expect(calls[1].body).toEqual({ name: expect.stringMatching(/^requesto-run-/), copyFrom: 'ws-original' });
  });

  it('works when the server has no active workspace', async () => {
    const freshCalls: Call[] = [];
    // Fresh server mock that 404s on "active"
    const fresh = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      freshCalls.push({ method: req.method ?? '', url: url.pathname });
      if (url.pathname === '/api/workspaces/active') return json(res, { error: 'No active workspace' }, 404);
      if (url.pathname === '/api/workspaces' && req.method === 'POST') return json(res, { id: 'ws-s2' });
      if (url.pathname.endsWith('/activate')) return json(res, { id: 'ws-s2' });
      if (url.pathname === '/api/workspaces/ws-s2') return json(res, { success: true });
      json(res, { error: 'not found' }, 404);
    });
    await new Promise<void>((resolve) => fresh.listen(0, '127.0.0.1', resolve));
    const freshUrl = `http://127.0.0.1:${(fresh.address() as AddressInfo).port}`;

    const isolation = new ScratchWorkspaceIsolation({ serverUrl: freshUrl });
    await isolation.setup();
    await isolation.teardown();

    fresh.close();
    expect(freshCalls.filter((c) => c.url === '/api/workspaces/active')).toHaveLength(1);
    expect(freshCalls.filter((c) => c.url === '/api/workspaces/ws-s2' && c.method === 'DELETE')).toHaveLength(1);
  });

  it('reports teardown problems from both restore and delete', async () => {
    const flaky = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (url.pathname === '/api/workspaces/active') return json(res, { id: 'ws-original-fail', name: 'x' });
      if (url.pathname === '/api/workspaces' && req.method === 'POST') return json(res, { id: 'ws-scratch2' });
      if (url.pathname === '/api/workspaces/ws-scratch2/activate') return json(res, { id: 'ws-scratch2' });
      if (url.pathname === '/api/workspaces/ws-original-fail/activate') return json(res, { error: 'activate broke' }, 500);
      if (url.pathname === '/api/workspaces/ws-scratch2' && req.method === 'DELETE') return json(res, { error: 'delete broke' }, 500);
      json(res, { error: 'not found' }, 404);
    });
    await new Promise<void>((resolve) => flaky.listen(0, '127.0.0.1', resolve));
    const flakyUrl = `http://127.0.0.1:${(flaky.address() as AddressInfo).port}`;

    const isolation = new ScratchWorkspaceIsolation({ serverUrl: flakyUrl });
    await isolation.setup();

    // Both teardown steps fail; the error mentions both, not just the first.
    await expect(isolation.teardown()).rejects.toThrow(/restoring workspace[\s\S]*deleting scratch workspace/);

    flaky.close();
  });

  it('normalises trailing slashes in the server URL', () => {
    const isolation = new ScratchWorkspaceIsolation({ serverUrl: 'http://localhost:4747/' });
    expect(isolation.target).toBe('http://localhost:4747');
  });

  it('fails with actionable guidance when the server is unreachable', async () => {
    // Nothing is listening on this port — fetch fails at the network level.
    const isolation = new ScratchWorkspaceIsolation({ serverUrl: 'http://127.0.0.1:9' });

    const err = await isolation.setup().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain('could not reach the Requesto server at http://127.0.0.1:9');
    expect((err as Error).message).toContain('Is it running?');
  });
});
