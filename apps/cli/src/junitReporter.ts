import fs from 'node:fs';
import type { RunSummary, RequestRunResult } from './types';

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function secondsStr(ms: number): string {
  return (ms / 1000).toFixed(3);
}

function buildTestCases(result: RequestRunResult): string {
  const label = [...result.folderPath, result.request.name].join(' / ');
  const timeAttr = result.duration != null ? ` time="${secondsStr(result.duration)}"` : '';

  // If the request errored (network/script error), emit one failing testcase
  if (result.error) {
    return (
      `    <testcase name="${xmlEscape(label)}" classname="requesto"${timeAttr}>\n` +
      `      <error message="${xmlEscape(result.error)}">${xmlEscape(result.error)}</error>\n` +
      `    </testcase>\n`
    );
  }

  // If no test scripts, emit one testcase reflecting the HTTP outcome
  if (!result.testResults.length) {
    return (
      `    <testcase name="${xmlEscape(label)}" classname="requesto"${timeAttr}/>\n`
    );
  }

  // One testcase per test() assertion
  return result.testResults
    .map((t) => {
      const name = xmlEscape(`${label} — ${t.name}`);
      if (t.passed) {
        return `    <testcase name="${name}" classname="requesto"${timeAttr}/>\n`;
      }
      const msg = xmlEscape(t.error ?? 'Assertion failed');
      return (
        `    <testcase name="${name}" classname="requesto"${timeAttr}>\n` +
        `      <failure message="${msg}">${msg}</failure>\n` +
        `    </testcase>\n`
      );
    })
    .join('');
}

export function generateJUnit(summary: RunSummary, outputPath: string): void {
  const totalTests = summary.results.reduce(
    (n, r) => n + (r.testResults.length || 1),
    0,
  );
  const totalFailures = summary.results.reduce(
    (n, r) => n + (r.error ? 1 : r.testResults.filter((t) => !t.passed).length),
    0,
  );

  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<testsuites name="Requesto" tests="${totalTests}" failures="${totalFailures}" time="${secondsStr(summary.durationMs)}">`,
    `  <testsuite name="${xmlEscape(summary.collectionName)}" tests="${totalTests}" failures="${totalFailures}" time="${secondsStr(summary.durationMs)}">`,
    ...summary.results.map(buildTestCases),
    `  </testsuite>`,
    `</testsuites>`,
  ];

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
}
