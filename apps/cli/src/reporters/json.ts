import type { RunSummary } from '../types.js';

/**
 * Machine-readable run report for pipelines that want to post-process
 * results (Slack summaries, dashboards, custom gates) — JUnit XML covers
 * the native CI test-report integrations.
 *
 * Contains the substituted request URL, so treat the file as sensitive
 * when variables carry secrets (tokens in query strings, etc.).
 */
export function buildJsonReport(summary: RunSummary): string {
  const report = {
    summary: {
      requests: {
        executed: summary.executed,
        passed: summary.passed,
        failed: summary.failed,
        errored: summary.errored,
        skipped: summary.skipped,
      },
      tests: {
        total: summary.totalTests,
        passed: summary.passedTests,
      },
      environment: summary.environmentName,
      bailTriggered: summary.bailTriggered,
      durationMs: summary.totalDuration,
      finishedAt: new Date().toISOString(),
    },
    results: summary.results.map((result) => ({
      collection: result.collectionName,
      request: result.request.name,
      requestId: result.request.id,
      method: result.request.method,
      url: result.request.url,
      status: result.status,
      httpStatus: result.response?.status ?? null,
      durationMs: result.duration ?? null,
      error: result.error ?? null,
      tests: result.testResults.map((test) => ({
        name: test.name,
        passed: test.passed,
        error: test.error ?? null,
      })),
    })),
  };

  return JSON.stringify(report, null, 2) + '\n';
}
