import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EmbeddedRequestoServer } from '../src/server/embedded.ts';

const tempDirs: string[] = [];

afterAll(() => {
  for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true });
});

/** Create a minimal committed-style workspace: one collection with one request. */
function makeWorkspace(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'requesto-engine-test-'));
  tempDirs.push(root);
  const requestoDir = path.join(root, '.requesto');
  fs.mkdirSync(path.join(requestoDir, 'collections'), { recursive: true });
  fs.mkdirSync(path.join(requestoDir, 'environments'), { recursive: true });
  fs.writeFileSync(
    path.join(requestoDir, 'collections', 'demo.json'),
    JSON.stringify({
      id: 'c1',
      name: 'Demo',
      folders: [],
      requests: [
        {
          id: 'r1',
          name: 'Health',
          method: 'GET',
          url: '{{baseUrl}}/health',
          collectionId: 'c1',
        },
      ],
    }),
    'utf8',
  );
  fs.writeFileSync(
    path.join(requestoDir, 'environments', 'demo.json'),
    JSON.stringify({
      id: 'env-1',
      name: 'Local',
      variables: [{ key: 'baseUrl', value: 'http://127.0.0.1:4747', enabled: true }],
    }),
    'utf8',
  );
  return requestoDir;
}

describe('EmbeddedRequestoServer', () => {
  it('boots a real server seeded from the workspace and reports its URL', async () => {
    const requestoDir = makeWorkspace();
    const server = new EmbeddedRequestoServer({ requestoDir });
    await server.start();

    try {
      expect(server.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);

      const res = await fetch(`${server.url}/health`);
      expect(res.ok).toBe(true);
      expect(await res.json()).toEqual({ status: 'ok' });

      // The scratch server serves the copied workspace's collections.
      const collections = await fetch(`${server.url}/api/collections`);
      expect(collections.ok).toBe(true);
      const body = (await collections.json()) as Array<{ name: string }>;
      expect(body.map((c) => c.name)).toContain('Demo');
    } finally {
      await server.stop();
    }
  });

  it('isolates mutations: writes land in the temp copy, never in the source workspace', async () => {
    const requestoDir = makeWorkspace();
    const server = new EmbeddedRequestoServer({ requestoDir });
    await server.start();

    try {
      const create = await fetch(`${server.url}/api/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Created By Run' }),
      });
      expect(create.ok).toBe(true);
    } finally {
      await server.stop();
    }

    const collectionFiles = fs.readdirSync(path.join(requestoDir, 'collections'));
    expect(collectionFiles).toHaveLength(1);
  });

  it('cleans up the temp workspace copy on stop', async () => {
    const requestoDir = makeWorkspace();
    const server = new EmbeddedRequestoServer({ requestoDir });
    await server.start();
    const url = server.url;
    await server.stop();
    await expect(fetch(`${url}/health`)).rejects.toThrow();
  });

  it('refuses to start without a workspace', async () => {
    const server = new EmbeddedRequestoServer({ requestoDir: path.join(os.tmpdir(), 'requesto-does-not-exist') });
    await expect(server.start()).rejects.toThrow('workspace not found');
  });
});
