import { describe, expect, it } from 'vitest';
import { executePreRequestScript, executeTestScript } from '../src/scripts/sandbox-core.ts';

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

  it('environment.get returns values parsed per the declared type', () => {
    const result = executePreRequestScript(
      [
        `if (environment.get('n') !== 42) { throw new Error('n: ' + JSON.stringify(environment.get('n'))); }`,
        `if (environment.get('flag') !== true) { throw new Error('flag: ' + JSON.stringify(environment.get('flag'))); }`,
        `if (environment.get('s') !== 'hello') { throw new Error('s: ' + JSON.stringify(environment.get('s'))); }`,
        // No declared type: string, even when it looks numeric.
        `if (environment.get('strNum') !== '123') { throw new Error('strNum: ' + JSON.stringify(environment.get('strNum'))); }`,
        // Declared Number but not a valid number literal: falls back to the string.
        `if (environment.get('zip') !== '02134') { throw new Error('zip: ' + JSON.stringify(environment.get('zip'))); }`,
      ].join('\n'),
      {
        env: { n: '42', flag: 'true', s: 'hello', strNum: '123', zip: '02134' },
        envTypes: { n: 'number', flag: 'boolean', zip: 'number' },
        request: baseRequest,
      },
    );
    // No throw above means every get() matched its declared type.
    expect(result.envOverrides.n).toBe('42');
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

  it('infers the variable type from the runtime type of the set() value', () => {
    const result = executePreRequestScript(
      `environment.set('n', 42); environment.set('flag', true); environment.set('s', 'hello'); environment.set('strNum', '123');`,
      { env: {}, request: baseRequest },
    );
    expect(result.envTypes).toEqual({ n: 'number', flag: 'boolean', s: 'string', strNum: 'string' });
  });

  it('environment.get returns the typed value a script set in the same run', () => {
    const result = executePreRequestScript(
      `environment.set('n', 42); if (environment.get('n') !== 42) { throw new Error('n: ' + JSON.stringify(environment.get('n'))); }`,
      { env: {}, request: baseRequest },
    );
    expect(result.envTypes.n).toBe('number');
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

  it('exposes query params parsed from the request url', () => {
    const result = executeTestScript(
      `test('params', () => {
        expect(request.params.id).toBe('7');
        expect(request.params.q).toBe('hello world');
        expect(request.params.missing).toBeUndefined();
      });`,
      { env: {}, response: baseResponse, request: { ...baseRequest, url: 'http://test.local/x?id=7&q=hello%20world' } },
    );
    expect(result.testResults[0].passed).toBe(true);
  });

  it('exposes form entries with file entries mapped to their file name', () => {
    const result = executeTestScript(
      `test('form', () => {
        expect(request.form.name).toBe('requesto');
        expect(request.form.attachment).toBe('a.txt');
      });`,
      {
        env: {},
        response: baseResponse,
        request: {
          ...baseRequest,
          formDataEntries: [
            { key: 'name', value: 'requesto', type: 'text' },
            { key: 'attachment', value: 'data:text/plain;base64,aGk=', type: 'file', fileName: 'a.txt' },
          ],
        },
      },
    );
    expect(result.testResults[0].passed).toBe(true);
  });

  it('request params and form default to empty objects', () => {
    const result = executeTestScript(
      `test('empty', () => {
        expect(request.params).toEqual({});
        expect(request.form).toEqual({});
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

describe('collectionVariables API', () => {
  const collectionCtx = {
    collectionVariables: { base: 'https://api.example.com', typed: '42', secret: 'abc' },
    collectionVariableTypes: { typed: 'number' },
  };

  it('exposes collectionVariables.get with declared types applied', () => {
    const result = executePreRequestScript(
      [
        `if (collectionVariables.get('base') !== 'https://api.example.com') { throw new Error('base'); }`,
        `if (collectionVariables.get('typed') !== 42) { throw new Error('typed'); }`,
        `if (collectionVariables.get('missing') !== '') { throw new Error('missing'); }`,
      ].join('\n'),
      { env: {}, request: baseRequest, ...collectionCtx },
    );
    // Untouched committed variables are not reported as overrides.
    expect(result.collectionOverrides).toEqual({});
  });

  it('collectionVariables.set only reports touched keys with inferred types', () => {
    const result = executePreRequestScript(
      `collectionVariables.set('token', 'abc'); collectionVariables.set('n', 7);`,
      { env: {}, request: baseRequest, ...collectionCtx },
    );
    expect(result.collectionOverrides).toEqual({ token: 'abc', n: '7' });
    expect(result.collectionTypes).toEqual({ token: 'string', n: 'number' });
    expect(result.collectionCleared).toEqual([]);
  });

  it('collectionVariables.has and clear work per key and for the whole scope', () => {
    const result = executePreRequestScript(
      [
        `if (!collectionVariables.has('secret')) { throw new Error('has before clear'); }`,
        `collectionVariables.clear('secret');`,
        `if (collectionVariables.has('secret')) { throw new Error('has after clear'); }`,
        `if (collectionVariables.get('secret') !== '') { throw new Error('get after clear'); }`,
        `collectionVariables.clear();`,
        `if (collectionVariables.has('base')) { throw new Error('clear() leaves base keys'); }`,
      ].join('\n'),
      { env: {}, request: baseRequest, ...collectionCtx },
    );
    expect(result.collectionCleared.sort()).toEqual(['base', 'secret', 'typed']);
    // Cleared keys are absent from the overrides.
    expect(result.collectionOverrides).toEqual({});
  });

  it('a set after clear revives the key', () => {
    const result = executePreRequestScript(
      [
        `collectionVariables.clear('secret');`,
        `collectionVariables.set('secret', 'new');`,
        `if (collectionVariables.get('secret') !== 'new') { throw new Error('revived'); }`,
      ].join('\n'),
      { env: {}, request: baseRequest, ...collectionCtx },
    );
    expect(result.collectionOverrides).toEqual({ secret: 'new' });
    expect(result.collectionCleared).toEqual([]);
  });

  it('test scripts can read and set collection variables', () => {
    const result = executeTestScript(
      [
        `test('read', () => { expect(collectionVariables.get('typed')).toBe(42); });`,
        `test('write', () => { collectionVariables.set('nextId', response.json().a); });`,
      ].join('\n'),
      { env: {}, response: baseResponse, request: baseRequest, ...collectionCtx },
    );
    expect(result.testResults.every((t) => t.passed)).toBe(true);
    expect(result.collectionOverrides).toEqual({ nextId: '1' });
  });
});
