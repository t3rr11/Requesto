import type { RunRequestResult, RunSummary, RunnerEvent } from 'requesto-engine';
import type { ReporterMode } from '../types.ts';

type Stream = { write: (chunk: string) => void };

export type ReporterMeta = {
  workspacePath: string;
  environmentName: string | null;
  /** Scratch server URL when the run used one. */
  serverUrl: string | null;
};

type Painter = {
  bold: (t: string) => string;
  dim: (t: string) => string;
  green: (t: string) => string;
  red: (t: string) => string;
  yellow: (t: string) => string;
};

function createPainter(stream: Stream): Painter {
  const enabled = 'isTTY' in stream ? Boolean((stream as { isTTY?: boolean }).isTTY) && !process.env.NO_COLOR : false;
  const wrap = (code: string) => (t: string) => (enabled ? `\u001b[${code}m${t}\u001b[0m` : t);
  return {
    bold: wrap('1'),
    dim: wrap('90'),
    green: wrap('32'),
    red: wrap('31'),
    yellow: wrap('33'),
  };
}

function statusIcon(result: RunRequestResult, paint: Painter): string {
  switch (result.status) {
    case 'passed': return paint.green('✓');
    case 'failed': return paint.red('✗');
    case 'error': return paint.yellow('✗');
    case 'skipped': return paint.dim('○');
  }
}

function dotChar(result: RunRequestResult, paint: Painter): string {
  switch (result.status) {
    case 'passed': return paint.green('·');
    case 'failed': return paint.red('×');
    case 'error': return paint.yellow('×');
    case 'skipped': return paint.dim('-');
  }
}

function durationTail(result: RunRequestResult): string {
  return result.duration !== undefined ? ` (${result.duration}ms)` : '';
}

/** Failing test lines shown under the request in the default reporter. */
function failingTestLines(result: RunRequestResult, paint: Painter): string[] {
  const lines: string[] = [];
  for (const test of result.testResults.filter((t) => !t.passed)) {
    lines.push(paint.red(`    ✗ ${test.name}`) + (test.error ? paint.dim(`: ${test.error.split('\n')[0]}`) : ''));
  }
  return lines;
}

/** All test lines (passed and failed) for the verbose reporter. */
function allTestLines(result: RunRequestResult, paint: Painter): string[] {
  const lines: string[] = [];
  for (const test of result.testResults) {
    if (test.passed) {
      lines.push(paint.green(`    ✓ ${test.name}`));
    } else {
      lines.push(paint.red(`    ✗ ${test.name}`));
      if (test.error) {
        for (const errLine of test.error.split('\n')) {
          lines.push(paint.dim(`      ${errLine}`));
        }
      }
    }
  }
  return lines;
}

export type ConsoleReporter = {
  /** Feed runner events; output streams as the run unfolds. */
  onEvent: (event: RunnerEvent) => void;
  /** Print the summary block once the run has finished. */
  finish: (summary: RunSummary, meta: ReporterMeta) => void;
};

/**
 * Vitest-style streaming reporter. Each request prints when it completes
 * with its icon and duration; failing tests print inline; a failures-only
 * summary and run totals close the output. Colours are disabled when not
 * attached to a TTY or when NO_COLOR is set.
 */
export function createConsoleReporter(mode: ReporterMode, stream: Stream = process.stdout): ConsoleReporter {
  const paint = createPainter(stream);
  let lastCollection = '';

  const writeCollectionHeader = (name: string): void => {
    if (lastCollection !== '') stream.write('\n');
    stream.write(paint.bold(`${name}\n`));
    lastCollection = name;
  };

  const writeRequestLine = (result: RunRequestResult): void => {
    stream.write(` ${statusIcon(result, paint)} ${result.request.name}${paint.dim(durationTail(result))}\n`);
  };

  const failureEntries = (summary: RunSummary): { label: string; lines: string[] }[] =>
    summary.results
      .filter((r) => r.status === 'failed' || r.status === 'error')
      .map((r) => ({
        label: `${r.collectionName} > ${r.request.name}`,
        lines:
          r.status === 'error'
            ? [paint.yellow(`    Error: ${r.error ?? 'unknown error'}`)]
            : failingTestLines(r, paint).concat(
                r.testResults.length === 0 ? [paint.dim('    (no assertions ran)')] : [],
              ),
      }));

  const writeFailuresSection = (summary: RunSummary): void => {
    const entries = failureEntries(summary);
    if (entries.length === 0) return;
    stream.write('\n' + paint.red(` Failed Requests (${entries.length})\n\n`));
    for (const entry of entries) {
      stream.write(paint.bold(`  ${entry.label}\n`));
      for (const line of entry.lines) stream.write(line + '\n');
      stream.write('\n');
    }
  };

  const writeSummary = (summary: RunSummary, meta: ReporterMeta): void => {
    const failed = summary.failed + summary.errored;
    const counts = [
      summary.passed > 0 ? paint.green(`${summary.passed} passed`) : null,
      failed > 0 ? paint.red(`${failed} failed`) : null,
      summary.skipped > 0 ? paint.dim(`${summary.skipped} skipped`) : null,
    ].filter(Boolean);

    stream.write('\n');
    stream.write(
      paint.bold(` Requests  ${counts.join(', ') || '0'} `) +
        paint.dim(`(${summary.executed} executed)\n`),
    );
    stream.write(
      ` Tests     ${summary.passedTests}/${summary.totalTests} passed\n`,
    );
    stream.write(paint.dim(` Duration  ${(summary.totalDuration / 1000).toFixed(2)}s\n`));
    stream.write(paint.dim(` Workspace ${meta.workspacePath}\n`));
    if (meta.environmentName) stream.write(paint.dim(` Env       ${meta.environmentName}\n`));
    if (meta.serverUrl) {
      stream.write(paint.dim(` Server    ${meta.serverUrl} (scratch, torn down after the run)\n`));
    }
    if (summary.bailTriggered) {
      stream.write(paint.dim('\n Run stopped early (--bail): a request failed or errored.\n'));
    }
  };

  return {
    onEvent(event) {
      switch (event.type) {
        case 'collection-start':
          writeCollectionHeader(event.collectionName);
          break;
        case 'request-end': {
          const result = event.result;
          if (mode === 'dot') {
            stream.write(dotChar(result, paint));
            break;
          }
          writeRequestLine(result);
          if (result.status === 'failed') {
            for (const line of failingTestLines(result, paint)) stream.write(line + '\n');
          } else if (mode === 'verbose') {
            for (const line of allTestLines(result, paint)) stream.write(line + '\n');
          }
          if (result.status === 'error' && result.error) {
            stream.write(paint.dim(`    Error: ${result.error.split('\n')[0]}\n`));
          }
          break;
        }
        case 'request-start':
          // Output happens on completion, matching how vitest reports.
          break;
      }
    },

    finish(summary, meta) {
      if (mode === 'dot') stream.write('\n');
      writeFailuresSection(summary);
      writeSummary(summary, meta);
    },
  };
}
