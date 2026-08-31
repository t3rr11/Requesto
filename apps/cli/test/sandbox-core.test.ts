import { describe, expect, it } from 'vitest';
import { executePreRequestScript, executeTestScript } from '../src/engine/sandbox-core';

const baseRequest = { method: 'GET', url: 'http://test.local/x', headers: {}, body: undefined };

const baseResponse = {
  status: 200,
  statusText: 'OK',
  headers: { 'content-type': 'application/json' },
  body: '{"a":1,"list":[1,2,3],"name":"requesto"}',
  duration: 12,
};

describe('executePreRequestScript', () => {
  it('exposes environment.get for existing variables', () => {
    const result = executePreRequestScript(
      `environment.set('out', environment.get('token') + '-x');`,
      { env: { token: 'abc' }, request: baseRequest },
    );
    expect(result.envOverrides).toEqual({ token: 'abc', out: 'abc-x' });
  });

  it('environment.get returns empty string for unknown keys', () => {
    const result = executePreRequestScript(`environment.set('out', environment.get('nope'));`, {
      env: {},
      request: baseRequest,
    });
    expect(result.envOverrides.out).toBe('');
  });

  it('can read the request', () => {
    const result = executePreRequestScript(`environment.set('m', request.method);`, {
      env: {},
      request: baseRequest,
    });
    expect(result.envOverrides.m).toBe('GET');
  });

  it('throws on script errors', () => {
    expect(() => executePreRequestScript('throw new Error("boom")', { env: {}, request: baseRequest })).toThrow('boom');
  });

  it('casts set() values to string', () => {
    const result = executePreRequestScript(`environment.set('n', 42);`, { env: {}, request: baseRequest });
    expect(result.envOverrides.n).toBe('42');
  });

  it('cannot reach Node or browser globals', () => {
    expect(() =>
      executePreRequestScript(`process.exit(1);`, { env: {}, request: baseRequest }),
    ).toThrow();
    expect(() =>
      executePreRequestScript(`fetch('http://evil.local');`, { env: {}, request: baseRequest }),
    ).toThrow();
    expect(() =>
      executePreRequestScript(`require('fs');`, { env: {}, request: baseRequest }),
    ).toThrow();
  });
});

describe('executeTestScript', () => {
  it('collects passing tests', () => {
    const result = executeTestScript(
      `test('one', () => { expect(1).toBe(1); }); test('two', () => {});`,
      { env: {}, response: baseResponse, request: baseRequest },
    );
    expect(result.testResults).toEqual([
      { name: 'one', passed: true },
      { name: 'two', passed: true },
    ]);
  });

  it('collects failing tests with messages', () => {
    const result = executeTestScript(
      `test('bad', () => { expect(1).toBe(2); });`,
      { env: {}, response: baseResponse, request: baseRequest },
    );
    expect(result.testResults[0].passed).toBe(false);
    expect(result.testResults[0].error).toContain('Expected 1 to be 2');
  });

  it('response.json parses the body', () => {
    const result = executeTestScript(`test('a', () => { expect(response.json().a).toBe(1); });`, {
      env: {},
      response: baseResponse,
      request: baseRequest,
    });
    expect(result.testResults[0].passed).toBe(true);
  });

  it('response exposes status/statusText/headers/duration', () => {
    const result = executeTestScript(
      `test('meta', () => {
        expect(response.status).toBe(200);
        expect(response.statusText).toBe('OK');
        expect(response.headers['content-type']).toBe('application/json');
        expect(response.duration).toBe(12);
      });`,
      { env: {}, response: baseResponse, request: baseRequest },
    );
    expect(result.testResults[0].passed).toBe(true);
  });

  it('supports matchers with .not inversion', () => {
    const result = executeTestScript(
      `test('m1', () => { expect('abc').toContain('b'); });
       test('m2', () => { expect([1,2,3]).toHaveLength(3); });
       test('m3', () => { expect('hello').toMatch(/^h/); });
       test('m4', () => { expect('x').not.toBe('y'); });
       test('m5', () => { expect(5).toBeGreaterThan(4); expect(5).toBeLessThanOrEqual(5); });
       test('m6', () => { expect(null).toBeNull(); expect(undefined).toBeUndefined(); expect(0).toBeDefined(); });
       test('m7', () => { expect({a:1}).toEqual({a:1}); });
       test('m8', () => { expect(1).toBeTruthy(); expect(0).toBeFalsy(); });`,
      { env: {}, response: baseResponse, request: baseRequest },
    );
    expect(result.testResults.every((t) => t.passed)).toBe(true);
  });

  it('test failures do not stop later tests', () => {
    const result = executeTestScript(
      `test('a', () => { expect(1).toBe(2); }); test('b', () => {});`,
      { env: {}, response: baseResponse, request: baseRequest },
    );
    expect(result.testResults).toHaveLength(2);
    expect(result.testResults[1].passed).toBe(true);
  });

  it('can set environment variables for later requests', () => {
    const result = executeTestScript(`environment.set('nextId', response.json().a);`, {
      env: {},
      response: baseResponse,
      request: baseRequest,
    });
    expect(result.envOverrides.nextId).toBe('1');
  });

  it('errors outside test() reject the whole script', () => {
    expect(() =>
      executeTestScript(`throw new Error('top-level');`, { env: {}, response: baseResponse, request: baseRequest }),
    ).toThrow('top-level');
  });
});
