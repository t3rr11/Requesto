import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CliWorkspace } from '../src/workspace/workspace.ts';

let tmpDir: string;
let dataDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'requesto-cli-ws-'));
  dataDir = path.join(tmpDir, '.requesto');
  fs.mkdirSync(path.join(dataDir, 'collections'), { recursive: true });
  fs.mkdirSync(path.join(dataDir, 'environments'), { recursive: true });
  fs.mkdirSync(path.join(dataDir, 'local'), { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeCollection(variables: unknown[]): void {
  fs.writeFileSync(
    path.join(dataDir, 'collections', 'my-col.json'),
    JSON.stringify({
      id: 'col-1',
      name: 'My Col',
      folders: [],
      requests: [],
      variables,
    }),
  );
  fs.writeFileSync(path.join(dataDir, 'order.json'), JSON.stringify({ collections: ['col-1'] }));
}

function workspace(): CliWorkspace {
  return new CliWorkspace(dataDir, {
    injectedSecrets: new Map(),
    seededRefreshTokens: new Map(),
    persistTokens: false,
  });
}

describe('CliWorkspace.getCollections', () => {
  it('returns committed collection variables untouched when the sidecar is empty', async () => {
    writeCollection([{ key: 'base', value: 'initial', enabled: true }]);
    const collections = await workspace().getCollections();
    expect(collections[0].variables).toEqual([{ key: 'base', value: 'initial', enabled: true }]);
  });

  it('merges sidecar current values into collection variables like the client', async () => {
    writeCollection([{ key: 'base', value: 'initial', enabled: true }]);
    fs.writeFileSync(
      path.join(dataDir, 'local', 'collections.local.json'),
      JSON.stringify({ 'col-1': { base: { value: 'current', type: 'string' } } }),
    );

    const collections = await workspace().getCollections();
    expect(collections[0].variables).toEqual([
      { key: 'base', value: 'initial', currentValue: 'current', type: 'string', enabled: true },
    ]);
  });

  it('appends sidecar-only keys as read-back entries', async () => {
    writeCollection([]);
    fs.writeFileSync(
      path.join(dataDir, 'local', 'collections.local.json'),
      JSON.stringify({ 'col-1': { generated: { value: '123', type: 'number' } } }),
    );

    const collections = await workspace().getCollections();
    expect(collections[0].variables).toEqual([
      { key: 'generated', value: '', currentValue: '123', type: 'number', enabled: true },
    ]);
  });
});
