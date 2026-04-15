import { describe, it, expect, vi } from 'vitest';
import { EnvironmentService } from '../../services/environment.service';
import type { EnvironmentRepository } from '../../repositories/environment.repository';
import type { Environment, EnvironmentsData } from '../../models/environment';
import { AppError } from '../../errors/app-error';

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
      expect(service.getAll()).toBe(data);
    });
  });

  describe('save', () => {
    it('saves and returns the environment', () => {
      const env = makeEnv();
      const repo = mockRepo({ save: vi.fn() });
      const service = new EnvironmentService(repo);
      const result = service.save(env);
      expect(repo.save).toHaveBeenCalledWith(env);
      expect(result).toBe(env);
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
});
