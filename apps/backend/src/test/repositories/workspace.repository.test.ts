import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'os';
import { WorkspaceRepository } from '../../repositories/workspace.repository';
import { CollectionRepository } from '../../repositories/collection.repository';
import { EnvironmentRepository } from '../../repositories/environment.repository';
import type { Collection, SavedRequest } from '../../models/collection';
import type { Environment } from '../../models/environment';

function makeCollection(id: string, name: string, requests: SavedRequest[] = []): Collection {
  return { id, name, folders: [], requests };
}

function makeEnvironment(id: string, name: string): Environment {
  return { id, name, variables: [] };
}

function listJsonFiles(dir: string): string[] {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
}

describe('WorkspaceRepository split-layout migration', () => {
  let dataDir: string;
  let repo: WorkspaceRepository;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'requesto-ws-migration-'));
    repo = new WorkspaceRepository(
      dataDir,
      path.join(dataDir, 'workspaces'),
      path.join(dataDir, 'workspaces.json'),
    );
  });

  afterEach(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('open() splits monolithic .requesto files into per-item files', () => {
    const wsPath = path.join(dataDir, 'ws-legacy');
    const requestoDir = path.join(wsPath, '.requesto');
    fs.mkdirSync(requestoDir, { recursive: true });
    fs.writeFileSync(path.join(requestoDir, 'collections.json'), JSON.stringify([
      makeCollection('c1', 'Alpha'),
      makeCollection('c2', 'Beta'),
    ]));
    fs.writeFileSync(path.join(requestoDir, 'environments.json'), JSON.stringify({
      activeEnvironmentId: 'e2',
      environments: [makeEnvironment('e1', 'Dev'), makeEnvironment('e2', 'Prod')],
    }));
    fs.writeFileSync(path.join(requestoDir, 'oauth-configs.json'), JSON.stringify({
      configs: [{ id: 'o1', name: 'GitHub' }],
    }));
    fs.writeFileSync(path.join(requestoDir, 'graphql-schemas.json'), JSON.stringify([
      { id: 'g1', name: 'Star Wars' },
    ]));

    repo.open('Test', wsPath);

    const collectionsDir = path.join(requestoDir, 'collections');
    expect(listJsonFiles(collectionsDir).sort()).toEqual(['alpha.json', 'beta.json']);
    expect(JSON.parse(fs.readFileSync(path.join(collectionsDir, 'alpha.json'), 'utf-8')).id).toBe('c1');

    expect(listJsonFiles(path.join(requestoDir, 'environments')).sort()).toEqual(['dev.json', 'prod.json']);
    expect(listJsonFiles(path.join(requestoDir, 'oauth-configs'))).toEqual(['github.json']);
    expect(listJsonFiles(path.join(requestoDir, 'graphql-schemas'))).toEqual(['star-wars.json']);

    // Order manifest preserves the original monolithic order per section
    const order = JSON.parse(fs.readFileSync(path.join(requestoDir, 'order.json'), 'utf-8'));
    expect(order.collections).toEqual(['c1', 'c2']);
    expect(order.environments).toEqual(['e1', 'e2']);
    expect(order.oauthConfigs).toEqual(['o1']);
    expect(order.graphqlSchemas).toEqual(['g1']);

    // Active environment selection moved to the gitignored local folder
    const active = JSON.parse(
      fs.readFileSync(path.join(requestoDir, 'local', 'active-environment.json'), 'utf-8'),
    );
    expect(active).toEqual({ activeEnvironmentId: 'e2' });

    // Monolithic files removed
    expect(fs.existsSync(path.join(requestoDir, 'collections.json'))).toBe(false);
    expect(fs.existsSync(path.join(requestoDir, 'environments.json'))).toBe(false);
    expect(fs.existsSync(path.join(requestoDir, 'oauth-configs.json'))).toBe(false);
    expect(fs.existsSync(path.join(requestoDir, 'graphql-schemas.json'))).toBe(false);
  });

  it('migration is idempotent on subsequent bootstraps', () => {
    const wsPath = path.join(dataDir, 'ws-legacy');
    const requestoDir = path.join(wsPath, '.requesto');
    fs.mkdirSync(requestoDir, { recursive: true });
    fs.writeFileSync(
      path.join(requestoDir, 'collections.json'),
      JSON.stringify([makeCollection('c1', 'Alpha')]),
    );

    repo.open('Test', wsPath);
    repo.bootstrap();

    expect(listJsonFiles(path.join(requestoDir, 'collections'))).toEqual(['alpha.json']);
    expect(fs.existsSync(path.join(requestoDir, 'collections.json'))).toBe(false);
  });

  it('bootstrap() migrates the pre-workspace flat layout into a split Default workspace', () => {
    fs.writeFileSync(
      path.join(dataDir, 'collections.json'),
      JSON.stringify([makeCollection('c1', 'Alpha')]),
    );
    fs.writeFileSync(
      path.join(dataDir, 'environments.json'),
      JSON.stringify({ activeEnvironmentId: 'e1', environments: [makeEnvironment('e1', 'Dev')] }),
    );

    repo.bootstrap();

    const requestoDir = path.join(dataDir, 'Default', '.requesto');
    expect(listJsonFiles(path.join(requestoDir, 'collections'))).toEqual(['alpha.json']);
    expect(listJsonFiles(path.join(requestoDir, 'environments'))).toEqual(['dev.json']);
    expect(JSON.parse(
      fs.readFileSync(path.join(requestoDir, 'local', 'active-environment.json'), 'utf-8'),
    )).toEqual({ activeEnvironmentId: 'e1' });
    expect(fs.existsSync(path.join(requestoDir, 'collections.json'))).toBe(false);
    expect(fs.existsSync(path.join(requestoDir, 'environments.json'))).toBe(false);
  });

  it('a fresh workspace gets empty split directories and no monolithic files', () => {
    const ws = repo.create('Fresh');

    const requestoDir = path.join(ws.path, '.requesto');
    for (const dir of ['collections', 'environments', 'oauth-configs', 'graphql-schemas']) {
      expect(fs.existsSync(path.join(requestoDir, dir))).toBe(true);
    }
    expect(fs.existsSync(path.join(requestoDir, 'collections.json'))).toBe(false);
    expect(fs.existsSync(path.join(requestoDir, 'environments.json'))).toBe(false);
  });
});

describe('WorkspaceRepository export/import', () => {
  let dataDir: string;
  let repo: WorkspaceRepository;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'requesto-ws-export-'));
    repo = new WorkspaceRepository(
      dataDir,
      path.join(dataDir, 'workspaces'),
      path.join(dataDir, 'workspaces.json'),
    );
  });

  afterEach(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('exports a monolithic bundle and importing it reproduces the split layout', () => {
    const source = repo.create('Source');
    repo.setActive(source.id);

    const getDataDir = () => repo.getDataDir();
    const getLocalDir = () => repo.getLocalDir();
    const collections = new CollectionRepository(getDataDir);
    const environments = new EnvironmentRepository(getDataDir, getLocalDir);

    const request: SavedRequest = {
      id: 'req-1',
      name: 'Get Users',
      method: 'GET',
      url: 'http://example.com/users',
      collectionId: 'c1',
    };
    collections.create(makeCollection('c1', 'Alpha', [request]));
    collections.create(makeCollection('c2', 'Beta'));
    environments.save(makeEnvironment('e1', 'Dev'));
    environments.save(makeEnvironment('e2', 'Prod'));
    environments.setActive('e2');
    collections.reorder(['c2', 'c1']);

    const bundle = repo.exportData(source.id);

    // Bundle keeps the legacy monolithic shape for portability
    expect(bundle.name).toBe('Source');
    const bundleCollections = bundle['collections.json'] as Collection[];
    expect(bundleCollections.map((c) => c.id)).toEqual(['c2', 'c1']);
    expect(bundleCollections[1].requests).toHaveLength(1);
    const bundleEnvironments = bundle['environments.json'] as {
      activeEnvironmentId: string | null;
      environments: Environment[];
    };
    expect(bundleEnvironments.activeEnvironmentId).toBe('e2');
    expect(bundleEnvironments.environments).toHaveLength(2);
    expect((bundle['oauth-configs.json'] as { configs: unknown[] }).configs).toEqual([]);
    expect(Array.isArray(bundle['graphql-schemas.json'])).toBe(true);

    const imported = repo.importData(bundle);
    const importedRequesto = path.join(imported.path, '.requesto');

    expect(listJsonFiles(path.join(importedRequesto, 'collections')).sort()).toEqual(['alpha.json', 'beta.json']);
    expect(
      JSON.parse(fs.readFileSync(path.join(importedRequesto, 'collections', 'alpha.json'), 'utf-8')).requests,
    ).toHaveLength(1);
    expect(listJsonFiles(path.join(importedRequesto, 'environments')).sort()).toEqual(['dev.json', 'prod.json']);
    expect(fs.existsSync(path.join(importedRequesto, 'collections.json'))).toBe(false);

    // Order and local active-environment selection are preserved
    const order = JSON.parse(fs.readFileSync(path.join(importedRequesto, 'order.json'), 'utf-8'));
    expect(order.collections).toEqual(['c2', 'c1']);
    expect(JSON.parse(
      fs.readFileSync(path.join(importedRequesto, 'local', 'active-environment.json'), 'utf-8'),
    )).toEqual({ activeEnvironmentId: 'e2' });

    // Re-exporting the imported workspace produces the same bundle
    const reExported = repo.exportData(imported.id);
    expect(reExported['collections.json']).toEqual(bundleCollections);
    expect(reExported['environments.json']).toEqual(bundleEnvironments);
  });

  it('imports legacy bundles that contain no graphql-schemas.json', () => {
    const legacyBundle = {
      name: 'Legacy',
      'collections.json': [makeCollection('c1', 'Alpha')],
      'environments.json': { activeEnvironmentId: null, environments: [] },
      'oauth-configs.json': { configs: [] },
    };

    const imported = repo.importData(legacyBundle);
    const importedRequesto = path.join(imported.path, '.requesto');

    expect(listJsonFiles(path.join(importedRequesto, 'collections'))).toEqual(['alpha.json']);
    expect(fs.existsSync(path.join(importedRequesto, 'graphql-schemas.json'))).toBe(false);
    expect(fs.existsSync(path.join(importedRequesto, 'collections.json'))).toBe(false);
  });
});
