import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import http from 'node:http';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { computeExitCode, runCommand } from '../src/commands/run.ts';
import { createConsoleReporter } from '../src/reporters/console.ts';
import type { RunResult } from '../src/types.ts';
import type { RunnerEvent } from 'requesto-engine';

const fixturePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'warnings');

let server: http.Server;
let baseUrl = '';

/** How long the /hang endpoint waits before answering (0 = immediately). */
const hangState = { delayMs: 0 };

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    res.on('error', () => {
      // Aborted client sockets: the client stopped listening long ago.
    });
    const json = (payload: unknown) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    };
    if (url.pathname === '/ok') json({ ok: true });
    else if (url.pathname === '/warn/500') {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal error');
    } else if (url.pathname === '/warn/404') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('nope');
    } else if (url.pathname === '/warn/graphql') {
      // HTTP 200 but a GraphQL errors envelope: the runner warns on it.
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ errors: [{ message: 'Validation failed' }] }));
    } else if (url.pathname === '/hang') {
      setTimeout(() => json({ wokeUp: true }), hangState.delayMs);
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server?.closeAllConnections();
  server?.close();
});

/** Run the fixture workspace while capturing the console reporter's output. */
async function runWithConsole(
  overrides: Partial<Parameters<typeof runCommand>[0]> = {}
): Promise<RunResult & { output: string }> {
  const chunks: string[] = [];
  const reporter = createConsoleReporter('default', { write: chunk => chunks.push(chunk) });
  const result = await runCommand({
    path: fixturePath,
    environment: 'ci',
    vars: [`baseUrl=${baseUrl}`],
    onEvent: (event: RunnerEvent) => reporter.onEvent(event),
    ...overrides,
  });
  reporter.finish(result.summary, {
    workspacePath: result.workspacePath,
    environmentName: result.environmentName,
    serverUrl: result.serverUrl,
  });
  return { ...result, output: chunks.join('') };
}

describe('run warnings (default behaviour)', () => {
  it('warns on 4xx/5xx and GraphQL error envelopes with zero tests, exit code 0', async () => {
    const { summary, output } = await runWithConsole();
    const byName = new Map(summary.results.map(r => [r.request.name, r]));

    expect(byName.get('Clean')?.status).toBe('passed');
    expect(byName.get('Server Error')?.status).toBe('warned');
    expect(byName.get('Server Error')?.warning).toBe('HTTP 500 Internal Server Error');
    expect(byName.get('Server Error')?.warningKind).toBe('http-status');
    expect(byName.get('GraphQL Errors')?.status).toBe('warned');
    expect(byName.get('GraphQL Errors')?.warning).toBe('Validation failed');
    expect(byName.get('GraphQL Errors')?.warningKind).toBe('graphql-errors');

    // An asserted 5xx stays passed (a passing test owns the status).
    expect(byName.get('Asserted Server Error')?.status).toBe('passed');
    expect(summary.warned).toBe(3);

    // Warns never fail the run.
    expect(computeExitCode(summary)).toBe(0);

    // Console output: amber ⚠ rows, inline warning text, separate counter.
    expect(output).toContain('⚠');
    expect(output).toContain('HTTP 500 Internal Server Error');
    expect(output).toContain('Validation failed');
    expect(output).toContain('3 warnings');

    // Warns are not failures.
    expect(output).not.toContain('Failed Requests');
  }, 30000);

  it('reports no warnings when --no-warn-http-errors maps through to the engine', async () => {
    const { summary } = await runCommand({
      path: fixturePath,
      environment: 'ci',
      vars: [`baseUrl=${baseUrl}`],
      noWarnHttpErrors: true,
    });

    expect(summary.results.every(r => r.status === 'passed')).toBe(true);
    expect(summary.warned).toBe(0);
    expect(computeExitCode(summary)).toBe(0);
  }, 30000);
});

describe('exit codes', () => {
  it('counts warns as failures only with failOnWarn', () => {
    const summary = {
      failed: 0,
      errored: 0,
      warned: 2,
    } as unknown as Parameters<typeof computeExitCode>[0];

    expect(computeExitCode(summary)).toBe(0);
    expect(computeExitCode(summary, { failOnWarn: true })).toBe(1);
  });
});

describe('abort plumbing', () => {
  it('cancels the in-flight request and skips the rest without hanging', async () => {
    hangState.delayMs = 3000;
    try {
      const controller = new AbortController();
      const result = await runCommand({
        path: fixturePath,
        environment: 'ci',
        vars: [`baseUrl=${baseUrl}`],
        signal: controller.signal,
        onEvent: event => {
          if (event.type === 'request-start' && event.request.name === 'Hangs') {
            // Abort just after the request dispatches so axios is mid-flight.
            setTimeout(() => controller.abort(), 100);
          }
        },
      });
      const { summary } = result;
      const byName = new Map(summary.results.map(r => [r.request.name, r]));

      expect(byName.get('Clean')?.status).toBe('passed');
      expect(byName.get('Server Error')?.status).toBe('warned');
      // The in-flight request was cancelled, not skipped.
      expect(byName.get('Hangs')?.status).toBe('error');
      expect(byName.get('Hangs')?.error).toContain('canceled');
      // Subsequent items land skipped.
      expect(byName.get('Not Found')?.status).toBe('skipped');

      expect(summary.executed).toBe(5);
      expect(summary.skipped).toBe(1);

      // A cancelled run must not surface as a clean pass.
      expect(computeExitCode(summary)).toBe(1);

      // The cancellation actually cut the request short instead of waiting
      // for the 3s server delay.
      expect(summary.totalDuration).toBeLessThan(2500);
    } finally {
      hangState.delayMs = 0;
    }
  }, 30000);
});
