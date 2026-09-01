import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import http from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeExitCode, runCommand } from '../src/commands/run.ts';

const fixturePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'demo');

let server: http.Server;
let baseUrl = '';
const workspacesCalls: string[] = [];

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname.startsWith('/api/workspaces')) {
      workspacesCalls.push(`${req.method} ${url.pathname}`);
    }
    const json = (payload: unknown) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    };
    if (url.pathname === '/items') json({ items: ['a', 'b'] });
    else if (url.pathname === '/echo') json(Object.fromEntries(url.searchParams));
    else if (url.pathname === '/me') json({ authorization: req.headers.authorization ?? null });
    else if (url.pathname === '/api/workspaces/active' && req.method === 'GET') json({ id: 'ws-original', name: 'Original', path: '/data/ws-original' });
    else if (url.pathname === '/api/workspaces' && req.method === 'POST') json({ id: 'ws-scratch', name: 'scratch', path: '/data/ws-scratch' });
    else if (url.pathname.endsWith('/activate') && req.method === 'POST') json({ id: 'ok' });
    else if (url.pathname.startsWith('/api/workspaces/ws-scratch') && req.method === 'DELETE') json({ success: true });
    else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server?.close();
});

describe('runCommand (end-to-end against the fixture workspace)', () => {
  it('runs all requests with CLI variable and token overrides', async () => {
    const { summary, environmentName } = await runCommand({
      path: fixturePath,
      environment: 'ci',
      vars: [`baseUrl=${baseUrl}`, 'apiKey=from-cli'],
      tokens: ['ci-auth=ci-token-123'],
    });

    const byName = new Map(summary.results.map((r) => [r.request.name, r]));

    expect(environmentName).toBe('ci');
    expect(byName.get('List Items')?.status).toBe('passed');
    expect(byName.get('Failing Assertion')?.status).toBe('failed');
    expect(byName.get('Unreachable Endpoint')?.status).toBe('error');
    expect(byName.get('Script Chaining')?.status).toBe('passed');
    expect(byName.get('OAuth Protected')?.status).toBe('passed');
    expect(byName.get('Secret Variable')?.status).toBe('passed');

    // Exit code convention
    expect(computeExitCode(summary)).toBe(1);
  }, 30000);

  it('exit code is 0 when everything passes', async () => {
    const { summary } = await runCommand({
      path: fixturePath,
      environment: 'ci',
      collections: ['CI Demo'],
      folders: ['Users'],
      vars: [`baseUrl=${baseUrl}`, 'apiKey=from-cli'],
      tokens: ['ci-auth=ci-token-123'],
    });

    expect(summary.results.map((r) => r.status)).toEqual(['passed', 'passed', 'passed']);
    expect(computeExitCode(summary)).toBe(0);
  }, 30000);

  it('provides actionable guidance for interactive OAuth flows without a token override', async () => {
    const { summary } = await runCommand({
      path: fixturePath,
      environment: 'ci',
      vars: [`baseUrl=${baseUrl}`, 'apiKey=from-cli'],
      // no tokens — the fixture OAuth config uses authorization-code-pkce (interactive)
    });

    const oauthRequest = summary.results.find((r) => r.request.name === 'OAuth Protected');
    expect(oauthRequest?.status).toBe('error');
    expect(oauthRequest?.error).toContain('cannot run headless');
    expect(oauthRequest?.error).toContain('--token ci-auth=');
    expect(oauthRequest?.error).toContain('REQUESTO_TOKEN_');
    // Other requests still execute
    expect(summary.results.find((r) => r.request.name === 'Script Chaining')?.status).toBe('passed');
  }, 30000);

  it('rejects unknown collection selectors with a config error', async () => {
    await expect(
      runCommand({ path: fixturePath, collections: ['Nope'] }),
    ).rejects.toThrow('Collection "Nope" not found');
  });

  it('rejects unknown environment selectors with a config error', async () => {
    await expect(
      runCommand({ path: fixturePath, environment: 'production' }),
    ).rejects.toThrow('Environment "production" not found');
  });

  it('reports missing workspaces with a config error', async () => {
    const emptyDir = mkdtempSync(path.join(tmpdir(), 'requesto-cli-nows-'));
    await expect(
      runCommand({ path: emptyDir }),
    ).rejects.toThrow('No .requesto workspace found');
  });

  it('resolves a workspace from a subdirectory by walking up', async () => {
    // The fixture's collections directory has no .requesto of its own — the
    // resolver must walk up to the workspace root.
    const { summary } = await runCommand({
      path: path.join(fixturePath, 'collections'),
      environment: 'ci',
      collections: ['CI Demo'],
      folders: ['Users'],
      vars: [`baseUrl=${baseUrl}`, 'apiKey=from-cli'],
      tokens: ['ci-auth=ci-token-123'],
    });
    expect(summary.results.every((r) => r.status === 'passed')).toBe(true);
  }, 30000);

  it('uses scratch-workspace protection when targeting an external server', async () => {
    const { summary } = await runCommand({
      path: fixturePath,
      environment: 'ci',
      collections: ['CI Demo'],
      folders: ['Users'],
      vars: [`baseUrl=${baseUrl}`, 'apiKey=from-cli'],
      tokens: ['ci-auth=ci-token-123'],
      server: baseUrl,
    });

    // The suite itself ran fine...
    expect(summary.results.every((r) => r.status === 'passed')).toBe(true);
    // ...and the isolation lifecycle happened against the "server"
    expect(workspacesCalls).toEqual([
      'GET /api/workspaces/active',
      'POST /api/workspaces',
      'POST /api/workspaces/ws-scratch/activate',
      'POST /api/workspaces/ws-original/activate',
      'DELETE /api/workspaces/ws-scratch',
    ]);
  }, 30000);

  it('boots an embedded scratch server when the run references requestoServerUrl', async () => {
    const { summary, serverUrl } = await runCommand({
      path: fixturePath,
      environment: 'ci',
      // No baseUrl override: the requests that use the scratch base variable
      // resolve against the ephemeral server the CLI started itself.
      vars: ['apiKey=from-cli'],
      tokens: ['ci-auth=ci-token-123'],
    });

    expect(serverUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    const scratchHealth = summary.results.find((r) => r.request.name === 'Scratch Health');
    expect(scratchHealth?.status).toBe('passed');
  }, 60000);

  it('does not boot a scratch server when nothing references it', async () => {
    const { summary, serverUrl } = await runCommand({
      path: fixturePath,
      environment: 'none',
      collections: ['CI Demo'],
      folders: ['Users'],
      vars: [`baseUrl=${baseUrl}`, 'apiKey=from-cli'],
      tokens: ['ci-auth=ci-token-123'],
    });

    expect(serverUrl).toBeNull();
    expect(summary.results.every((r) => r.status === 'passed')).toBe(true);
  }, 30000);

  it('skips collections matched by --exclude-collection', async () => {
    const { summary } = await runCommand({
      path: fixturePath,
      excludeCollections: ['CI Demo'],
    });

    expect(summary.results).toHaveLength(0);
    expect(summary.executed).toBe(0);
    expect(computeExitCode(summary)).toBe(0);
  }, 30000);
});
