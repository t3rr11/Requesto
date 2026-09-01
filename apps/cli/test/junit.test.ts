import { describe, expect, it } from 'vitest';
import { buildJunitReport } from '../src/reporters/junit';
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
    totalDuration: 1500,
    environmentName: 'ci',
    bailTriggered: false,
  };
}

describe('buildJunitReport', () => {
  it('renders passing tests as testcases inside a collection suite', () => {
    const xml = buildJunitReport(
      summary([
        {
          collectionId: 'c1',
          collectionName: 'API',
          request: request('List'),
          status: 'passed',
          response: null,
          testResults: [
            { name: 'status is 200', passed: true },
            { name: 'has items', passed: true },
          ],
        },
      ]),
    );
    expect(xml).toContain('<testsuites name="requesto" tests="2" failures="0" errors="0"');
    expect(xml).toContain('<testsuite name="API" tests="2" failures="0" errors="0"');
    expect(xml).toContain('classname="API / List"');
    expect(xml).toContain('<testcase name="status is 200"');
  });

  it('renders failing tests with failure elements', () => {
    const xml = buildJunitReport(
      summary([
        {
          collectionId: 'c1',
          collectionName: 'API',
          request: request('List'),
          status: 'failed',
          response: null,
          testResults: [{ name: 'status', passed: false, error: 'Expected 500 to be 200' }],
        },
      ]),
    );
    expect(xml).toContain('failures="1"');
    expect(xml).toContain('<failure message="Expected 500 to be 200"');
  });

  it('renders request errors as error testcases', () => {
    const xml = buildJunitReport(
      summary([
        {
          collectionId: 'c1',
          collectionName: 'API',
          request: request('Dead'),
          status: 'error',
          response: null,
          testResults: [],
          error: 'connect ECONNREFUSED',
        },
      ]),
    );
    expect(xml).toContain('errors="1"');
    expect(xml).toContain('<error message="connect ECONNREFUSED"');
  });

  it('renders requests without tests as their own testcase', () => {
    const xml = buildJunitReport(
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
    expect(xml).toContain('<testcase name="Request: Ping"');
  });

  it('renders skipped requests', () => {
    const xml = buildJunitReport(
      summary([
        {
          collectionId: 'c1',
          collectionName: 'API',
          request: request('Skipped'),
          status: 'skipped',
          response: null,
          testResults: [],
        },
      ]),
    );
    expect(xml).toContain('<skipped/>');
  });

  it('escapes XML special characters', () => {
    const xml = buildJunitReport(
      summary([
        {
          collectionId: 'c1',
          collectionName: 'API <special> & "quotes"',
          request: request('Req & <name>'),
          status: 'failed',
          response: null,
          testResults: [{ name: 't', passed: false, error: `Expected "a<b" && c` }],
        },
      ]),
    );
    expect(xml).toContain('name="API &lt;special&gt; &amp; &quot;quotes&quot;"');
    expect(xml).toContain('Expected &quot;a&lt;b&quot; &amp;&amp; c');
  });
});
