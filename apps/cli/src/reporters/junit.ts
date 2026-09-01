import type { RunRequestResult, RunSummary } from '../types.ts';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function seconds(ms: number | undefined): string {
  return ((ms ?? 0) / 1000).toFixed(3);
}

function testcase(result: RunRequestResult, indent: string): string[] {
  const classname = escapeXml(result.collectionName);
  const lines: string[] = [];

  if (result.status === 'error') {
    lines.push(
      `${indent}<testcase name="${escapeXml(result.request.name)}" classname="${classname}" time="${seconds(result.duration)}">`,
    );
    lines.push(
      `${indent}  <error message="${escapeXml(result.error ?? 'Request error')}" type="RequestError">${escapeXml(result.error ?? 'Request error')}</error>`,
    );
    lines.push(`${indent}</testcase>`);
    return lines;
  }

  if (result.status === 'skipped') {
    lines.push(
      `${indent}<testcase name="${escapeXml(result.request.name)}" classname="${classname}" time="0">`,
      `${indent}  <skipped/>`,
      `${indent}</testcase>`,
    );
    return lines;
  }

  if (result.testResults.length === 0) {
    // No test script: report the request itself as a testcase so CI shows it.
    lines.push(
      `${indent}<testcase name="Request: ${escapeXml(result.request.name)}" classname="${classname}" time="${seconds(result.duration)}"/>`,
    );
    return lines;
  }

  for (const test of result.testResults) {
    if (test.passed) {
      lines.push(
        `${indent}<testcase name="${escapeXml(test.name)}" classname="${escapeXml(`${result.collectionName} / ${result.request.name}`)}" time="0"/>`,
      );
    } else {
      lines.push(
        `${indent}<testcase name="${escapeXml(test.name)}" classname="${escapeXml(`${result.collectionName} / ${result.request.name}`)}" time="0">`,
      );
      lines.push(
        `${indent}  <failure message="${escapeXml(test.error ?? 'Test failed')}" type="AssertionError">${escapeXml(test.error ?? 'Test failed')}</failure>`,
      );
      lines.push(`${indent}</testcase>`);
    }
  }
  return lines;
}

/**
 * Build a JUnit XML report for CI systems (GitHub Actions, GitLab, Azure
 * DevOps, Jenkins). One `<testsuite>` per collection; each `test()` assertion
 * becomes a `<testcase>`, request-level errors become `<error>` testcases.
 */
export function buildJunitReport(summary: RunSummary): string {
  const suites: string[] = [];
  const collections = [...new Set(summary.results.map((r) => r.collectionName))];

  for (const collectionName of collections) {
    const results = summary.results.filter((r) => r.collectionName === collectionName);
    const tests = results.reduce((acc, r) => {
      if (r.status === 'error') return acc + 1;
      if (r.status === 'skipped') return acc + 1;
      return acc + (r.testResults.length > 0 ? r.testResults.length : 1);
    }, 0);
    const failures = results.reduce(
      (acc, r) => acc + r.testResults.filter((t) => !t.passed).length,
      0,
    );
    const errors = results.filter((r) => r.status === 'error').length;
    const time = seconds(results.reduce((acc, r) => acc + (r.duration ?? 0), 0));

    suites.push(
      [
        `  <testsuite name="${escapeXml(collectionName)}" tests="${tests}" failures="${failures}" errors="${errors}" time="${time}">`,
        ...results.flatMap((r) => testcase(r, '    ')),
        `  </testsuite>`,
      ].join('\n'),
    );
  }

  const totalTests = suites.length === 0 ? 0 : summary.results.reduce((acc, r) => {
    if (r.status === 'error' || r.status === 'skipped') return acc + 1;
    return acc + (r.testResults.length > 0 ? r.testResults.length : 1);
  }, 0);
  const totalFailures = summary.results.reduce(
    (acc, r) => acc + r.testResults.filter((t) => !t.passed).length,
    0,
  );
  const totalErrors = summary.results.filter((r) => r.status === 'error').length;

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<testsuites name="requesto" tests="${totalTests}" failures="${totalFailures}" errors="${totalErrors}" time="${seconds(summary.totalDuration)}">`,
    ...suites,
    `</testsuites>`,
    ``,
  ].join('\n');
}
