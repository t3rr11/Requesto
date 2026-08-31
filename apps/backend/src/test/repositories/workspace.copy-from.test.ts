import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { WorkspaceRepository } from '../../repositories/workspace.repository';

function makeRepo() {
  const dataDir = mkdtempSync(path.join(tmpdir(), 'requesto-ws-'));
  return new WorkspaceRepository(
    dataDir,
    path.join(dataDir, 'workspaces'),
    path.join(dataDir, 'workspaces.json'),
  );
}

describe('WorkspaceRepository.create with copyFrom', () => {
  it('copies environments, oauth configs and local auth state from the source workspace', () => {
    const repo = makeRepo();
    const source = repo.create('Source');

    // Seed execution context into the source workspace
    const sourceRequesto = path.join(source.path, '.requesto');
    writeFileSync(path.join(sourceRequesto, 'environments', 'env-1.json'), JSON.stringify({ id: 'env-1', name: 'Staging', variables: [] }));
    writeFileSync(path.join(sourceRequesto, 'oauth-configs', 'cfg-1.json'), JSON.stringify({ id: 'cfg-1', name: 'Entra', flowType: 'authorization-code-pkce' }));
    writeFileSync(path.join(sourceRequesto, 'collections', 'col-1.json'), JSON.stringify({ id: 'col-1', name: 'Should NOT be copied', folders: [], requests: [] }));
    writeFileSync(path.join(sourceRequesto, 'local', 'oauth-secrets.json'), JSON.stringify({ secrets: { 'cfg-1': 'sec' } }));
    writeFileSync(path.join(sourceRequesto, 'local', 'oauth-tokens.json'), JSON.stringify({ tokens: { 'cfg-1': { accessToken: 'at', tokenType: 'Bearer', obtainedAt: 1 } } }));
    writeFileSync(path.join(sourceRequesto, 'local', 'active-environment.json'), JSON.stringify({ activeEnvironmentId: 'env-1' }));
    writeFileSync(path.join(sourceRequesto, 'local', 'history.json'), JSON.stringify([{ id: 'h1' }]));

    const target = repo.create('Scratch', source.id);
    const targetRequesto = path.join(target.path, '.requesto');

    // Execution context copied
    expect(existsSync(path.join(targetRequesto, 'environments', 'env-1.json'))).toBe(true);
    expect(existsSync(path.join(targetRequesto, 'oauth-configs', 'cfg-1.json'))).toBe(true);
    expect(JSON.parse(readFileSync(path.join(targetRequesto, 'local', 'oauth-secrets.json'), 'utf8')).secrets['cfg-1']).toBe('sec');
    expect(existsSync(path.join(targetRequesto, 'local', 'oauth-tokens.json'))).toBe(true);
    expect(JSON.parse(readFileSync(path.join(targetRequesto, 'local', 'active-environment.json'), 'utf8')).activeEnvironmentId).toBe('env-1');

    // Collections and history are not part of the execution context
    expect(existsSync(path.join(targetRequesto, 'collections', 'col-1.json'))).toBe(false);
    expect(readFileSync(path.join(targetRequesto, 'local', 'history.json'), 'utf8')).toBe('[]');
  });

  it('creates an empty workspace when the source has nothing to copy', () => {
    const repo = makeRepo();
    const source = repo.create('Empty');
    const target = repo.create('Scratch', source.id);
    expect(existsSync(path.join(target.path, '.requesto', 'environments'))).toBe(true);
    expect(existsSync(path.join(target.path, '.requesto', 'local', 'oauth-tokens.json'))).toBe(false);
  });

  it('rejects an unknown copyFrom workspace', () => {
    const repo = makeRepo();
    expect(() => repo.create('Scratch', 'ws-nope')).toThrow('unknown workspace');
  });
});
