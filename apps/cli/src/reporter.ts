import type { RequestRunResult, RunSummary, SavedRequest } from './types';

// ANSI codes — stripped when not a TTY or NO_COLOR is set
const useColor = Boolean(process.stdout.isTTY) && !process.env['NO_COLOR'];
const c = {
  reset: useColor ? '\x1b[0m' : '',
  bold: useColor ? '\x1b[1m' : '',
  dim: useColor ? '\x1b[2m' : '',
  green: useColor ? '\x1b[32m' : '',
  red: useColor ? '\x1b[31m' : '',
  yellow: useColor ? '\x1b[33m' : '',
  cyan: useColor ? '\x1b[36m' : '',
};

function pad(s: string, width: number): string {
  return s.padStart(width);
}

function formatDuration(ms: number): string {
  return `${ms}ms`;
}

function requestLabel(result: Pick<RequestRunResult, 'request' | 'folderPath'>): string {
  const parts = [...result.folderPath, result.request.name];
  return parts.join(' / ');
}

function resultPassed(result: RequestRunResult): boolean {
  return !result.error && result.testResults.every((t) => t.passed);
}

export interface Reporter {
  onRunStart(collectionName: string, total: number): void;
  onRequestStart(request: SavedRequest, folderPath: string[]): void;
  onRequestEnd(result: RequestRunResult): void;
  onRunEnd(summary: RunSummary): void;
  log(message: string): void;
}

export function createReporter(verbose: boolean): Reporter {
  return {
    log(message: string): void {
      process.stdout.write(message + '\n');
    },

    onRunStart(collectionName: string, _total: number): void {
      process.stdout.write(`\n${c.bold}Running Requesto tests...${c.reset} ${c.dim}(${collectionName})${c.reset}\n\n`);
    },

    onRequestStart(_request: SavedRequest, _folderPath: string[]): void {
      if (verbose) {
        // Running indicator could go here in future
      }
    },

    onRequestEnd(result: RequestRunResult): void {
      const passed = resultPassed(result);
      const icon = passed ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
      const label = requestLabel(result);
      const status = result.status != null ? pad(String(result.status), 5) : '  ---';
      const duration = result.duration != null ? pad(formatDuration(result.duration), 8) : '';
      const statusColored = result.status != null
        ? (result.status < 300 ? `${c.green}${status}${c.reset}` : `${c.yellow}${status}${c.reset}`)
        : `${c.dim}${status}${c.reset}`;

      process.stdout.write(`  ${icon} ${label.padEnd(50)} ${statusColored}  ${c.dim}${duration}${c.reset}\n`);

      for (const t of result.testResults) {
        const tIcon = t.passed ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
        process.stdout.write(`      ${tIcon} ${c.dim}${t.name}${c.reset}\n`);
      }
    },

    onRunEnd(summary: RunSummary): void {
      // Print failure details
      const failures = summary.results.filter((r) => !resultPassed(r));
      if (failures.length) {
        process.stdout.write('\n');
        for (const result of failures) {
          const label = requestLabel(result);
          process.stdout.write(`\n${c.bold}${c.red}${label}${c.reset}\n\n`);

          if (result.error) {
            process.stdout.write(`  ${c.red}${result.error}${c.reset}\n`);
          }

          for (const t of result.testResults.filter((tr) => !tr.passed)) {
            process.stdout.write(`  ${c.red}✗ ${t.name}${c.reset}\n`);
            if (t.error) process.stdout.write(`    ${c.dim}${t.error}${c.reset}\n`);
          }

          // Show response body for context (truncated for binary)
          if (result.body && result.bodyEncoding !== 'base64') {
            const preview = result.body.length > 500 ? result.body.slice(0, 500) + '...' : result.body;
            process.stdout.write(`\n  Response:\n`);
            for (const line of preview.split('\n')) {
              process.stdout.write(`  ${c.dim}${line}${c.reset}\n`);
            }
          } else if (result.bodyEncoding === 'base64') {
            process.stdout.write(`\n  Response: ${c.dim}[binary data]${c.reset}\n`);
          }
        }
        process.stdout.write('\n');
      }

      const passedLabel = `${c.green}${summary.passed} passed${c.reset}`;
      const failedLabel = summary.failed ? `${c.red}${summary.failed} failed${c.reset}` : `0 failed`;
      process.stdout.write(`\n${passedLabel}, ${failedLabel}\n`);
      process.stdout.write(`${c.dim}Time: ${summary.durationMs}ms${c.reset}\n`);
    },
  };
}
