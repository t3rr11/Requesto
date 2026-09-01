import { describe, expect, it } from 'vitest';
import { buildJsonReport } from '../src/reporters/json';
import type { RunSummary } from '../src/types';
import type { SavedRequest } from '../src/types';

function request(name: string): SavedRequest {
  return { id: `req-${name}`, name, method: 'POST', url: 'http://test.local/x', collectionId: 'c1' };
}

function summary(results: RunSummary['results']): RunSummary {
  return {
    results,
    executed: results.filter((r) => r.status !== 'skipped').length,
    passed: results.filter((r) => r.status === 'passed').length,
    failed: results.filter((r) => r.status === 'failed').length,
    errored: results.filter((r) => r.status === 'error').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    totalTests: results.reduce((a, r) => a + r.testResults.length, 0),
    passedTests: results.reduce((a, r) => a + r.testResults.filter((t) => t.passed).length, 0),
    totalDuration: 912,
    environmentName: 'staging',
    bailTriggered: false,
  };
}

describe('buildJsonReport', () => {
  it('produces valid JSON with a summary block and per-request detail', () => {
    const report = JSON.parse(buildJsonReport(summary([
      {
        collectionId: 'c1',
        collectionName: 'API',
        request: request('Create'),
        status: 'passed',
        response: { status: 201, statusText: 'Created', headers: {}, body: '', bodyEncoding: 'utf8', duration: 8 },
        testResults: [
          { name: 'status is 201', passed: true },
          { name: 'has an id', passed: true },
        ],
        duration: 8,
      },
      {
        collectionId: 'c1',
        collectionName: 'API',
        request: request('Dead'),
        status: 'error',
        response: null,
        testResults: [],
        error: 'connect ECONNREFUSED',
      },
      {
        collectionId: 'c1',
        collectionName: 'API',
        request: request('Rest'),
        status: 'skipped',
        response: null,
        testResults: [],
      },
    ])));

    expect(report.summary.requests).toEqual({ executed: 2, passed: 1, failed: 0, errored: 1, skipped: 1 });
    expect(report.summary.tests).toEqual({ total: 2, passed: 2 });
    expect(report.summary.environment).toBe('staging');
    expect(report.summary.durationMs).toBe(912);
    expect(report.summary.finishedAt).toBeTruthy();

    expect(report.results).toHaveLength(3);
    const created = report.results[0];
    expect(created).toMatchObject({
      collection: 'API',
      request: 'Create',
      requestId: 'req-Create',
      method: 'POST',
      url: 'http://test.local/x',
      status: 'passed',
      httpStatus: 201,
      durationMs: 8,
      error: null,
    });
    expect(created.tests).toEqual([
      { name: 'status is 201', passed: true, error: null },
      { name: 'has an id', passed: true, error: null },
    ]);
    expect(report.results[1]).toMatchObject({ status: 'error', httpStatus: null, error: 'connect ECONNREFUSED' });
    expect(report.results[2]).toMatchObject({ status: 'skipped' });
  });

  it('reports failing assertions with their messages', () => {
    const report = JSON.parse(buildJsonReport(summary([
      {
        collectionId: 'c1',
        collectionName: 'API',
        request: request('Failing'),
        status: 'failed',
        response: null,
        testResults: [{ name: 'nope', passed: false, error: 'Expected 1 to be 2' }],
      },
    ])));

    expect(report.results[0].tests[0]).toEqual({ name: 'nope', passed: false, error: 'Expected 1 to be 2' });
    expect(report.summary.tests).toEqual({ total: 1, passed: 0 });
  });

  it('handles an empty run', () => {
    const report = JSON.parse(buildJsonReport(summary([])));
    expect(report.summary.requests.executed).toBe(0);
    expect(report.results).toEqual([]);
  });
});
