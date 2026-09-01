import { describe, expect, it } from 'vitest';
import { createConsoleReporter } from '../src/reporters/console.ts';
import type { RunSummary, RunnerEvent } from 'requesto-engine';
import type { SavedRequest } from 'requesto-engine';

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

/** Replay a finished summary through the reporter, as the CLI does live. */
function capture(
  sum: RunSummary,
  mode: 'default' | 'verbose' | 'dot' = 'default',
): string {
  const chunks: string[] = [];
  const reporter = createConsoleReporter(mode, { write: (chunk) => chunks.push(chunk) });
  let lastCollection = '';
  for (const result of sum.results) {
    const event: RunnerEvent =
      result.status === 'skipped'
        ? { type: 'request-end', result }
        : {
            type: 'request-start',
            collectionId: result.collectionId,
            collectionName: result.collectionName,
            request: result.request,
          };
    if (result.collectionName !== lastCollection) {
      reporter.onEvent({
        type: 'collection-start',
        collectionId: result.collectionId,
        collectionName: result.collectionName,
      });
      lastCollection = result.collectionName;
    }
    if (event.type === 'request-start') reporter.onEvent(event);
    reporter.onEvent({ type: 'request-end', result });
  }
  reporter.finish(sum, { workspacePath: '/repo/.requesto', environmentName: 'ci', serverUrl: null });
  return chunks.join('');
}

describe('console reporter (default)', () => {
  it('prints failing tests inline and hides passing ones', () => {
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

    expect(output).toContain('API');
    expect(output).toContain('✗ Create');
    expect(output).toContain('✗ has an id');
    expect(output).toContain('Expected undefined to be defined');
    expect(output).not.toContain('✓ status is 201');
  });

  it('prints a failures-only section before the summary', () => {
    const output = capture(
      summary([
        {
          collectionId: 'c1',
          collectionName: 'API',
          request: request('Bad'),
          status: 'failed',
          response: null,
          testResults: [{ name: 'nope', passed: false, error: 'Expected 1 to be 2' }],
        },
        {
          collectionId: 'c1',
          collectionName: 'API',
          request: request('Fine'),
          status: 'passed',
          response: null,
          testResults: [],
          duration: 3,
        },
      ]),
    );

    const failuresAt = output.indexOf('Failed Requests (1)');
    const summaryAt = output.indexOf('Requests');
    expect(failuresAt).toBeGreaterThan(-1);
    expect(summaryAt).toBeGreaterThan(failuresAt);
    expect(output).toContain('API > Bad');
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

    expect(output).toContain('✗ Dead');
    expect(output).toContain('ECONNREFUSED');
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

    expect(output).toContain('○ Rest');
    expect(output).toContain('Run stopped early (--bail)');
  });

  it('groups requests under collection headers and includes run metadata', () => {
    const output = capture(
      summary([
        { collectionId: 'c1', collectionName: 'First', request: request('A'), status: 'passed', response: null, testResults: [] },
        { collectionId: 'c2', collectionName: 'Second', request: request('B'), status: 'passed', response: null, testResults: [] },
      ]),
    );

    expect(output).toContain('First');
    expect(output).toContain('Second');
    expect(output.indexOf('First')).toBeLessThan(output.indexOf('Second'));
    expect(output).toContain('Workspace /repo/.requesto');
    expect(output).toContain('Env       ci');
  });
});

describe('console reporter (verbose)', () => {
  it('lists passing tests too', () => {
    const output = capture(
      summary([
        {
          collectionId: 'c1',
          collectionName: 'API',
          request: request('Create'),
          status: 'passed',
          response: null,
          testResults: [{ name: 'status is 201', passed: true }],
          duration: 5,
        },
      ]),
      'verbose',
    );

    expect(output).toContain('✓ status is 201');
  });
});

describe('console reporter (dot)', () => {
  it('prints one character per request and still shows the summary', () => {
    const output = capture(
      summary([
        { collectionId: 'c1', collectionName: 'First', request: request('A'), status: 'passed', response: null, testResults: [] },
        { collectionId: 'c1', collectionName: 'First', request: request('B'), status: 'failed', response: null, testResults: [{ name: 'x', passed: false }] },
      ]),
      'dot',
    );

    expect(output).toContain('·');
    expect(output).toContain('×');
    expect(output).toContain('Requests');
    expect(output).not.toContain('✓ A');
  });
});
