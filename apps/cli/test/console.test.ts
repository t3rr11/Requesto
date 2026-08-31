import { describe, expect, it } from 'vitest';
import { printConsoleReport } from '../src/reporters/console';
import type { RunSummary } from '../src/types';
import type { SavedRequest } from '../src/types';

function request(name: string): SavedRequest {
  return { id: `req-${name}`, name, method: 'GET', url: 'http://test.local', collectionId: 'c1' };
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
    totalDuration: 500,
    environmentName: 'ci',
    bailTriggered: false,
  };
}

function capture(summary: RunSummary): string {
  const chunks: string[] = [];
  printConsoleReport(summary, { write: (chunk) => chunks.push(chunk) });
  return chunks.join('');
}

describe('printConsoleReport', () => {
  it('lists every test under its request, passed and failed', () => {
    const output = capture(
      summary([
        {
          collectionId: 'c1',
          collectionName: 'API',
          request: request('Create'),
          status: 'failed',
          response: { status: 201, statusText: 'Created', headers: {}, body: '', bodyEncoding: 'utf8', duration: 7 },
          testResults: [
            { name: 'status is 201', passed: true },
            { name: 'has an id', passed: false, error: 'Expected undefined to be defined' },
          ],
          duration: 7,
        },
      ]),
    );

    expect(output).toContain('Collection: API');
    expect(output).toContain('⋯ Create …');
    expect(output).toContain('✗ 201 Created  7ms  (2 tests)');
    expect(output).toContain('✓ status is 201');
    expect(output).toContain('✗ has an id');
    expect(output).toContain('Expected undefined to be defined');
    expect(output).toContain('1/2 tests passed');
  });

  it('shows request errors with their message', () => {
    const output = capture(
      summary([
        {
          collectionId: 'c1',
          collectionName: 'API',
          request: request('Dead'),
          status: 'error',
          response: null,
          testResults: [],
          error: 'connect ECONNREFUSED 127.0.0.1:1',
        },
      ]),
    );

    expect(output).toContain('error — connect ECONNREFUSED 127.0.0.1:1');
  });

  it('marks skipped requests and reports the bail reason', () => {
    const output = capture({
      ...summary([
        {
          collectionId: 'c1',
          collectionName: 'API',
          request: request('Rest'),
          status: 'skipped',
          response: null,
          testResults: [],
        },
      ]),
      skipped: 1,
      bailTriggered: true,
    });

    expect(output).toContain('(skipped)');
    expect(output).toContain('Run stopped early (--bail)');
  });

  it('requests without tests do not add test lines', () => {
    const output = capture(
      summary([
        {
          collectionId: 'c1',
          collectionName: 'API',
          request: request('Ping'),
          status: 'passed',
          response: null,
          testResults: [],
        },
      ]),
    );

    expect(output).not.toMatch(/[✓✗] status|Request:/);
    expect(output).toContain('⋯ Ping …');
    expect(output).toContain('✓');
  });

  it('groups requests under collection headers', () => {
    const output = capture(
      summary([
        { collectionId: 'c1', collectionName: 'First', request: request('A'), status: 'passed', response: null, testResults: [] },
        { collectionId: 'c2', collectionName: 'Second', request: request('B'), status: 'passed', response: null, testResults: [] },
      ]),
    );

    expect(output).toContain('Collection: First');
    expect(output).toContain('Collection: Second');
    expect(output.indexOf('Collection: First')).toBeLessThan(output.indexOf('Collection: Second'));
  });
});
