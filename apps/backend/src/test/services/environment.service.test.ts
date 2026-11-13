import { describe, it, expect, vi } from 'vitest';
import { EnvironmentService } from '../../services/environment.service';
import type { EnvironmentRepository } from '../../repositories/environment.repository';
import type { Environment, EnvironmentsData } from '../../models/environment';
import { AppError } from '../../errors/app-error';
import { EnvironmentLocalRepository } from '../../repositories/environment-local.repository';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function makeEnv(overrides: Partial<Environment> = {}): Environment {
  return {
    id: 'env-1',
    name: 'Test Env',
    variables: [],
    ...overrides,
  };
}

function makeEnvsData(envs: Environment[], activeId = ''): EnvironmentsData {
  return { environments: envs, activeEnvironmentId: activeId };
}

function mockRepo(overrides: Partial<EnvironmentRepository> = {}): EnvironmentRepository {
  return {
    getAll: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    setActive: vi.fn(),
    getActive: vi.fn(),
    findById: vi.fn(),
    replaceAll: vi.fn(),
    ...overrides,
  } as unknown as EnvironmentRepository;
}

describe('EnvironmentService', () => {
  describe('getAll', () => {
    it('delegates to repo.getAll', () => {
      const data = makeEnvsData([makeEnv()]);
      const repo = mockRepo({ getAll: vi.fn().mockReturnValue(data) });
      const service = new EnvironmentService(repo);
      expect(service.getAll()).toEqual(data);
    });

    it('reloads existing and script-created current values from the local sidecar', () => {
      const dir = mkdtempSync(join(tmpdir(), 'requesto-env-'));
      try {
        const env = makeEnv({ variables: [{ key: 'existing', value: 'initial', enabled: true }] });
        const repo = mockRepo({
          getAll: vi.fn().mockReturnValue(makeEnvsData([env], env.id)),
          getActive: vi.fn().mockReturnValue(env),
          findById: vi.fn().mockReturnValue(env),
        });
        const service = new EnvironmentService(repo, new EnvironmentLocalRepository(() => dir));
        service.setCurrentValues(env.id, { existing: 'updated', created: 'new' });

        const expected = [
          { key: 'existing', value: 'initial', currentValue: 'updated', enabled: true },
          { key: 'created', value: '', currentValue: 'new', enabled: true },
        ];
        expect(service.getAll().environments[0].variables).toEqual(expected);
        expect(service.getActive()?.variables).toEqual(expected);
        expect(env.variables).toEqual([{ key: 'existing', value: 'initial', enabled: true }]);
        service.resetCurrentValues(env.id);
        expect(service.getAll().environments[0].variables).toEqual(env.variables);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('persists and reloads the type a script recorded alongside the value', () => {
      const dir = mkdtempSync(join(tmpdir(), 'requesto-env-'));
      try {
        const env = makeEnv({
          variables: [
            { key: 'existing', value: 'initial', enabled: true },
            { key: 'typed', value: 'initial', type: 'string', enabled: true },
          ],
        });
        const repo = mockRepo({
          getAll: vi.fn().mockReturnValue(makeEnvsData([env], env.id)),
          getActive: vi.fn().mockReturnValue(env),
          findById: vi.fn().mockReturnValue(env),
        });
        const service = new EnvironmentService(repo, new EnvironmentLocalRepository(() => dir));
        service.setCurrentValues(
          env.id,
          { existing: '1', created: '2', typed: '3' },
          { existing: 'number', created: 'number', typed: 'number' },
        );

        const expected = [
          { key: 'existing', value: 'initial', currentValue: '1', enabled: true, type: 'number' },
          { key: 'typed', value: 'initial', currentValue: '3', enabled: true, type: 'number' },
          { key: 'created', value: '', currentValue: '2', enabled: true, type: 'number' },
        ];
        expect(service.getAll().environments[0].variables).toEqual(expected);
        expect(service.getActive()?.variables).toEqual(expected);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('keeps a recorded type when a later set omits it, and reads legacy string-only sidecar entries', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'requesto-env-'));
      try {
        const env = makeEnv({ variables: [] });
        const repo = mockRepo({
          getAll: vi.fn().mockReturnValue(makeEnvsData([env], env.id)),
          getActive: vi.fn().mockReturnValue(env),
          findById: vi.fn().mockReturnValue(env),
        });
        const service = new EnvironmentService(repo, new EnvironmentLocalRepository(() => dir));
        service.setCurrentValues(env.id, { appId: '1001' }, { appId: 'number' });
        // Later override without a type: the recorded type survives.
        service.setCurrentValues(env.id, { appId: '1002' });
        expect(service.getActive()?.variables).toEqual([
          { key: 'appId', value: '', currentValue: '1002', enabled: true, type: 'number' },
        ]);

        // Legacy sidecar written before types existed: plain string entries.
        const { writeFileSync } = await import('node:fs');
        service.resetCurrentValues(env.id);
        writeFileSync(
          join(dir, 'environments.local.json'),
          JSON.stringify({ [env.id]: { legacy: 'value-only' } }),
        );
        expect(service.getActive()?.variables).toEqual([
          { key: 'legacy', value: '', currentValue: 'value-only', enabled: true },
        ]);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe('save', () => {
    it('saves and returns the environment', () => {
      const env = makeEnv();
      const repo = mockRepo({ save: vi.fn() });
      const service = new EnvironmentService(repo);
      const result = service.save(env);
      expect(repo.save).toHaveBeenCalledWith(env);
      expect(result).toEqual(env);
    });
  });

  describe('delete', () => {
    it('throws badRequest when repo returns false', () => {
      const repo = mockRepo({ delete: vi.fn().mockReturnValue(false) });
      const service = new EnvironmentService(repo);
      expect(() => service.delete('env-1')).toThrow(AppError);
      expect(() => service.delete('env-1')).toThrow('Cannot delete the last remaining environment');
    });

    it('succeeds when repo returns true', () => {
      const repo = mockRepo({ delete: vi.fn().mockReturnValue(true) });
      const service = new EnvironmentService(repo);
      expect(() => service.delete('env-1')).not.toThrow();
    });
  });

  describe('setActive', () => {
    it('throws notFound when repo returns false', () => {
      const repo = mockRepo({ setActive: vi.fn().mockReturnValue(false) });
      const service = new EnvironmentService(repo);
      expect(() => service.setActive('env-x')).toThrow(AppError);
      expect(() => service.setActive('env-x')).toThrow('Environment not found');
    });

    it('succeeds when repo returns true', () => {
      const repo = mockRepo({ setActive: vi.fn().mockReturnValue(true) });
      const service = new EnvironmentService(repo);
      expect(() => service.setActive('env-1')).not.toThrow();
    });
  });

  describe('getActive', () => {
    it('returns null when no active environment', () => {
      const repo = mockRepo({ getActive: vi.fn().mockReturnValue(null) });
      const service = new EnvironmentService(repo);
      expect(service.getActive()).toBeNull();
    });

    it('returns the active environment', () => {
      const env = makeEnv();
      const repo = mockRepo({ getActive: vi.fn().mockReturnValue(env) });
      const service = new EnvironmentService(repo);
      expect(service.getActive()).toBe(env);
    });
  });

  describe('substituteInRequest', () => {
    it('substitutes variables using the active environment', () => {
      const env = makeEnv({
        variables: [{ key: 'BASE_URL', value: 'https://api.example.com', enabled: true }],
      });
      const repo = mockRepo({ getActive: vi.fn().mockReturnValue(env) });
      const service = new EnvironmentService(repo);
      const result = service.substituteInRequest({ url: '{{BASE_URL}}/users', headers: {}, body: undefined, formDataEntries: undefined });
      expect(result.url).toBe('https://api.example.com/users');
    });

    it('leaves URL unchanged when no active environment', () => {
      const repo = mockRepo({ getActive: vi.fn().mockReturnValue(null) });
      const service = new EnvironmentService(repo);
      const result = service.substituteInRequest({ url: '{{BASE_URL}}/users', headers: {}, body: undefined, formDataEntries: undefined });
      expect(result.url).toBe('{{BASE_URL}}/users');
    });
  });

  describe('substituteInAuth', () => {
    it('substitutes credentials using the active environment', () => {
      const env = makeEnv({
        variables: [{ key: 'TOKEN', value: 'sekret', enabled: true }],
      });
      const repo = mockRepo({ getActive: vi.fn().mockReturnValue(env) });
      const service = new EnvironmentService(repo);
      const result = service.substituteInAuth({ type: 'bearer', bearer: { token: '{{TOKEN}}' } });
      expect(result?.bearer?.token).toBe('sekret');
      expect(repo.getActive).toHaveBeenCalledOnce();
    });

    it('returns auth unchanged when there is no active environment', () => {
      const repo = mockRepo({ getActive: vi.fn().mockReturnValue(null) });
      const service = new EnvironmentService(repo);
      const auth = { type: 'bearer' as const, bearer: { token: '{{TOKEN}}' } };
      expect(service.substituteInAuth(auth)).toEqual(auth);
    });

    it('returns undefined when auth is undefined', () => {
      const repo = mockRepo({ getActive: vi.fn().mockReturnValue(makeEnv()) });
      const service = new EnvironmentService(repo);
      expect(service.substituteInAuth(undefined)).toBeUndefined();
    });
  });

  describe('getForExport', () => {
    it('returns committed data without sidecar current values', () => {
      const dir = mkdtempSync(join(tmpdir(), 'requesto-env-'));
      try {
        const env = makeEnv({ variables: [{ key: 'existing', value: 'initial', enabled: true }] });
        const repo = mockRepo({ findById: vi.fn().mockReturnValue(env) });
        const service = new EnvironmentService(repo, new EnvironmentLocalRepository(() => dir));
        service.setCurrentValues(env.id, { existing: 'updated' });

        expect(service.getForExport(env.id)).toBe(env);
        expect(env.variables).toEqual([{ key: 'existing', value: 'initial', enabled: true }]);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('throws notFound when the environment does not exist', () => {
      const repo = mockRepo({ findById: vi.fn().mockReturnValue(undefined) });
      const service = new EnvironmentService(repo);
      expect(() => service.getForExport('missing')).toThrow(AppError);
    });
  });
});
