import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'os';
import { EnvironmentRepository } from '../../repositories/environment.repository';
import type { Environment } from '../../models/environment';

function makeEnv(overrides: Partial<Environment> = {}): Environment {
  return {
    id: `env-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name: 'Test Env',
    variables: [],
    ...overrides,
  };
}

function readOrder(dataDir: string): Record<string, string[]> {
  return JSON.parse(fs.readFileSync(path.join(dataDir, 'order.json'), 'utf-8'));
}

function readActiveSelection(dataDir: string): { activeEnvironmentId: string | null } {
  return JSON.parse(
    fs.readFileSync(path.join(dataDir, 'local', 'active-environment.json'), 'utf-8'),
  );
}

describe('EnvironmentRepository', () => {
  let tmpDir: string;
  let repo: EnvironmentRepository;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'requesto-test-'));
    fs.mkdirSync(path.join(tmpDir, 'local'), { recursive: true });
    repo = new EnvironmentRepository(() => tmpDir, () => path.join(tmpDir, 'local'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array when no environments directory', () => {
    const data = repo.getAll();
    expect(data.environments).toEqual([]);
    expect(data.activeEnvironmentId).toBeNull();
  });

  it('saves and retrieves an environment', () => {
    const env = makeEnv({ name: 'Production' });
    repo.save(env);

    const data = repo.getAll();
    const found = data.environments.find((e) => e.id === env.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('Production');
    expect(readOrder(tmpDir).environments).toEqual([env.id]);
  });

  it('writes each environment to its own slug-named file', () => {
    const env = makeEnv({ name: 'Production' });
    repo.save(env);

    const envFile = path.join(tmpDir, 'environments', 'production.json');
    expect(fs.existsSync(envFile)).toBe(true);
    expect(JSON.parse(fs.readFileSync(envFile, 'utf-8')).id).toBe(env.id);
  });

  it('renames the file when an environment is renamed', () => {
    const env = makeEnv({ name: 'Original' });
    repo.save(env);

    repo.save({ ...env, name: 'Renamed' });

    const dirFiles = fs.readdirSync(path.join(tmpDir, 'environments'));
    expect(dirFiles).toEqual(['renamed.json']);
    expect(repo.findById(env.id)?.name).toBe('Renamed');
    expect(readOrder(tmpDir).environments).toEqual([env.id]);
  });

  it('findById returns the environment', () => {
    const env = makeEnv({ name: 'Staging' });
    repo.save(env);

    const found = repo.findById(env.id);
    expect(found?.name).toBe('Staging');
  });

  it('findById returns undefined for unknown id', () => {
    expect(repo.findById('nonexistent')).toBeUndefined();
  });

  it('deletes an environment when more than one exists', () => {
    const env1 = makeEnv({ name: 'Env 1' });
    const env2 = makeEnv({ name: 'Env 2' });
    repo.save(env1);
    repo.save(env2);

    const result = repo.delete(env1.id);
    expect(result).toBe(true);

    const data = repo.getAll();
    expect(data.environments.find((e) => e.id === env1.id)).toBeUndefined();
    expect(readOrder(tmpDir).environments).toEqual([env2.id]);
  });

  it('prevents deleting the last environment', () => {
    const env = makeEnv({ name: 'Only Env' });
    repo.save(env);

    const data = repo.getAll();
    expect(data.environments).toHaveLength(1);

    const result = repo.delete(env.id);
    expect(result).toBe(false);
  });

  it('defaults the active environment to the first in the workspace order', () => {
    const env1 = makeEnv({ name: 'E1' });
    const env2 = makeEnv({ name: 'E2' });
    repo.save(env1);
    repo.save(env2);

    const data = repo.getAll();
    expect(data.activeEnvironmentId).toBe(env1.id);
    expect(repo.getActive()?.id).toBe(env1.id);
  });

  it('setActive stores the selection locally without touching committed data', () => {
    const env1 = makeEnv({ name: 'E1' });
    const env2 = makeEnv({ name: 'E2' });
    repo.save(env1);
    repo.save(env2);

    const success = repo.setActive(env2.id);
    expect(success).toBe(true);

    const active = repo.getActive();
    expect(active?.id).toBe(env2.id);
    expect(readActiveSelection(tmpDir)).toEqual({ activeEnvironmentId: env2.id });
    expect(fs.existsSync(path.join(tmpDir, 'environments.json'))).toBe(false);
  });

  it('falls back to the first environment when the selection no longer exists', () => {
    const env1 = makeEnv({ name: 'E1' });
    const env2 = makeEnv({ name: 'E2' });
    repo.save(env1);
    repo.save(env2);
    repo.setActive(env2.id);

    repo.delete(env2.id);

    expect(repo.getActive()?.id).toBe(env1.id);
    expect(repo.getAll().activeEnvironmentId).toBe(env1.id);
  });

  it('setActive returns false for unknown id', () => {
    const success = repo.setActive('nonexistent');
    expect(success).toBe(false);
  });

  it('replaceAll writes all environments, removes missing ones and preserves order', () => {
    const env1 = makeEnv({ name: 'Env 1' });
    const env2 = makeEnv({ name: 'Env 2' });
    repo.save(env1);
    repo.save(env2);

    const env3 = makeEnv({ name: 'Env 3' });
    repo.replaceAll({
      activeEnvironmentId: env3.id,
      environments: [env3, env1],
    });

    const data = repo.getAll();
    expect(data.environments.map((e) => e.id)).toEqual([env3.id, env1.id]);
    expect(data.activeEnvironmentId).toBe(env3.id);
    expect(fs.existsSync(path.join(tmpDir, 'environments', 'env-2.json'))).toBe(false);
    expect(readOrder(tmpDir).environments).toEqual([env3.id, env1.id]);
  });
});
