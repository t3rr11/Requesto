import type { RunRequestResult, RunSummary } from '../types.ts';
import type { RunnerEvent } from '../types.ts';

type Stream = { write: (chunk: string) => void };

const useColor = (): boolean => process.stdout.isTTY && !process.env.NO_COLOR;

function c(enabled: boolean): (code: string, text: string) => string {
  return enabled
    ? (code, text) => `\u001b[${code}m${text}\u001b[0m`
    : (_code, text) => text;
}

/** Every test listed under its request — passed ones included, so nothing is hidden. */
function testLines(result: RunRequestResult, color: (code: string, text: string) => string): string[] {
  const lines: string[] = [];
  for (const test of result.testResults) {
    if (test.passed) {
      lines.push(color('32', `      ✓ ${test.name}`));
    } else {
      lines.push(color('31', `      ✗ ${test.name}`));
      if (test.error) {
        for (const line of test.error.split('\n')) {
          lines.push(color('90', `        ${line}`));
        }
      }
    }
  }
  return lines;
}

/** Completion appended to the in-flight line once the request finishes. */
function resultTail(result: RunRequestResult, color: (code: string, text: string) => string): string {
  if (result.status === 'error') {
    return color('31', `✗ error — ${result.error ?? 'unknown error'}`);
  }
  const status = result.response ? `${result.response.status} ${result.response.statusText}`.trim() : '';
  const duration = result.duration !== undefined ? `${result.duration}ms` : '';
  const meta = [status, duration].filter(Boolean).join('  ');
  const tests = result.testResults.length > 0 ? `  (${result.testResults.length} test${result.testResults.length === 1 ? '' : 's'})` : '';
  const icon = result.status === 'passed' ? color('32', '✓') : color('31', '✗');
  return `${icon} ${meta}${tests}`.trimEnd();
}

/** Full line for requests that finish without having been announced (skipped). */
function skippedLine(result: RunRequestResult): string {
  return `  ○ ${result.request.name} (skipped)`;
}

export type ConsoleReporter = {
  /** Feed runner events; output streams as the run unfolds. */
  onEvent: (event: RunnerEvent) => void;
  /** Print the summary block once the run has finished. */
  finish: (summary: RunSummary) => void;
};

/**
 * Streaming console reporter, styled after the client's collection runner.
 * Each request prints while it is in flight (`⋯ name …`) and completes with
 * its status, duration and the full list of tests — so a slow or hung
 * request is visible immediately. Colours are disabled automatically when
 * not attached to a TTY or when `NO_COLOR` is set.
 */
export function createConsoleReporter(stream: Stream = process.stdout): ConsoleReporter {
  const color = c(useColor());
  const bold = (t: string) => color('1', t);
  const dim = (t: string) => color('90', t);
  const red = (t: string) => color('31', t);

  let pending = false;
  let lastCollection = '';

  return {
    onEvent(event) {
      switch (event.type) {
        case 'collection-start': {
          if (lastCollection !== '') stream.write('\n');
          stream.write(bold(`Collection: ${event.collectionName}\n`));
          lastCollection = event.collectionName;
          break;
        }
        case 'request-start': {
          stream.write(`  ${dim('⋯')} ${event.request.name} ${dim('…')} `);
          pending = true;
          break;
        }
        case 'request-end': {
          if (event.result.status === 'skipped' && !pending) {
            stream.write(skippedLine(event.result) + '\n');
          } else {
            stream.write(resultTail(event.result, color) + '\n');
          }
          pending = false;
          for (const line of testLines(event.result, color)) {
            stream.write(line + '\n');
          }
          break;
        }
      }
    },

    finish(summary) {
      stream.write('\n');
      stream.write(
        bold(
          `Summary: ${summary.passed}/${summary.executed} requests passed` +
            ` · ${summary.passedTests}/${summary.totalTests} tests passed` +
            (summary.errored > 0 ? ` · ${red(`${summary.errored} error${summary.errored === 1 ? '' : 's'}`)}` : '') +
            (summary.skipped > 0 ? ` · ${summary.skipped} skipped` : '') +
            dim(` (${(summary.totalDuration / 1000).toFixed(2)}s)`),
        ) + '\n',
      );
      if (summary.bailTriggered) {
        stream.write(dim('Run stopped early (--bail): a request failed or errored.\n') + '\n');
      }
    },
  };
}

/**
 * Full-report variant of the streaming reporter — replays a finished
 * `RunSummary` through the same line builders, producing identical output.
 * Used programmatically and by tests; the CLI streams live instead.
 */
export function printConsoleReport(summary: RunSummary, stream: Stream = process.stdout): void {
  const reporter = createConsoleReporter(stream);
  let lastCollection = '';
  for (const result of summary.results) {
    if (result.collectionName !== lastCollection) {
      reporter.onEvent({
        type: 'collection-start',
        collectionId: result.collectionId,
        collectionName: result.collectionName,
      });
      lastCollection = result.collectionName;
    }
    if (result.status === 'skipped') {
      reporter.onEvent({ type: 'request-end', result });
    } else {
      reporter.onEvent({
        type: 'request-start',
        collectionId: result.collectionId,
        collectionName: result.collectionName,
        request: result.request,
      });
      reporter.onEvent({ type: 'request-end', result });
    }
  }
  reporter.finish(summary);
}
