import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
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

describe('EnvironmentRepository', () => {
  let tmpDir: string;
  let repo: EnvironmentRepository;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'requesto-test-'));
    repo = new EnvironmentRepository(() => tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array when no environments file', () => {
    const data = repo.getAll();
    expect(data.environments).toEqual([]);
  });

  it('saves and retrieves an environment', () => {
    const env = makeEnv({ name: 'Production' });
    repo.save(env);

    const data = repo.getAll();
    const found = data.environments.find((e) => e.id === env.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('Production');
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
  });

  it('prevents deleting the last environment', () => {
    const env = makeEnv({ name: 'Only Env' });
    repo.save(env);

    const data = repo.getAll();
    expect(data.environments).toHaveLength(1);

    const result = repo.delete(env.id);
    expect(result).toBe(false);
  });

  it('setActive marks environment as active', () => {
    const env1 = makeEnv({ name: 'E1' });
    const env2 = makeEnv({ name: 'E2' });
    repo.save(env1);
    repo.save(env2);

    const success = repo.setActive(env2.id);
    expect(success).toBe(true);

    const active = repo.getActive();
    expect(active?.id).toBe(env2.id);
  });

  it('setActive returns false for unknown id', () => {
    const success = repo.setActive('nonexistent');
    expect(success).toBe(false);
  });
});
