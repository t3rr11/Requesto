#!/usr/bin/env node
import { Command, CommanderError } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import { CliAuthError, CliError } from './cli-error.ts';
import { computeExitCode, runCommand, type RunOptions } from './run-command.ts';
import { createConsoleReporter } from './reporters/console.ts';
import { buildJunitReport } from './reporters/junit.ts';
import { buildJsonReport } from './reporters/json.ts';
import { CLI_VERSION } from './version.ts';

function collect<T>(map: (value: string) => T) {
  return (value: string, previous: T[]): T[] => [...previous, map(value)];
}

function parseReporter(spec: string): { type: 'console' } | { type: 'junit'; file: string } | { type: 'json'; file: string } {
  if (spec === 'console') return { type: 'console' };
  if (spec.startsWith('junit:')) return { type: 'junit', file: spec.slice('junit:'.length) };
  if (spec.startsWith('json:')) return { type: 'json', file: spec.slice('json:'.length) };
  throw new CliError(
    `Unknown reporter "${spec}". Supported: console, junit:<path>, json:<path>`,
  );
}

async function main(): Promise<number> {
  const program = new Command();
  // Route usage errors (unknown flags, bad values, help/version) through the
  // catch block below so exit codes stay consistent: 0 pass, 1 failures, 2 config.
  program.exitOverride();
  let exitCode = 0;

  program
    .name('requesto')
    .description('Headless Requesto CLI — run your API test collections in CI pipelines.')
    .version(CLI_VERSION);

  program
    .command('run', { isDefault: true })
    .description(
      'Run collections from a .requesto workspace (the default command).\n\n' +
        'PATH can be the repository root (containing .requesto), the .requesto directory itself,\n' +
        'or any directory inside them — it defaults to the current directory and walks up.\n\n' +
        'Exit codes: 0 = all passed, 1 = failures/errors, 2 = configuration error.',
    )
    .argument('[path]', 'repository or .requesto directory', process.cwd())
    .option('-c, --collection <name>', 'collection to run (name or id, repeatable; default: all)', collect((v) => v), [])
    .option('-f, --folder <name>', 'folder to run within the selected collections (name or id, repeatable)', collect((v) => v), [])
    .option('-e, --environment <name>', 'environment (name or id, or "none"; default: active environment)')
    .option('--var <key=value>', 'variable override (repeatable; highest precedence)', collect((v) => v), [])
    .option('--var-file <path>', '.env file providing variable overrides')
    .option('--token <configId=accessToken>', 'access token to use for an OAuth config, e.g. --token my-entra=eyJ... (repeatable; REQUESTO_TOKEN_* env vars work too)', collect((v) => v), [])
    .option('--oauth-secret <configId=secret>', 'client secret for a non-interactive OAuth config (repeatable; REQUESTO_OAUTH_SECRET_* env vars work too)', collect((v) => v), [])
    .option('--refresh-token <configId=token>', 'refresh token to seed for an OAuth config (repeatable; REQUESTO_REFRESH_TOKEN_* env vars work too)', collect((v) => v), [])
    .option('-x, --bail', 'stop the run after the first failed or errored request', false)
    .option('--insecure', 'skip TLS certificate verification (self-signed certs)', false)
    .option('--timeout <ms>', 'per-request timeout in ms (default 30000)', (v: string) => {
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) throw new CliError(`Invalid --timeout value "${v}"`);
      return n;
    })
    .option('--persist', 'persist OAuth tokens acquired during the run to .requesto/local/ (default: memory only)', false)
    .option('--isolated <serverUrl>', 'run inside a scratch workspace on the Requesto server at <serverUrl>; the previously active workspace is restored and the scratch workspace deleted afterwards')
    .option('--reporter <spec>', 'reporter: "console", "junit:<path>" or "json:<path>" (repeatable; default: console)', collect((v) => parseReporter(v)), [])
    .action(async (pathArg: string, opts: Record<string, unknown>) => {
      const reporters = (opts.reporter as Array<ReturnType<typeof parseReporter>>).length
        ? (opts.reporter as Array<ReturnType<typeof parseReporter>>)
        : [{ type: 'console' as const }];

      // The console reporter streams while the run is in flight.
      const consoleReporter = reporters.some((r) => r.type === 'console')
        ? createConsoleReporter()
        : null;
      const fileReporters = reporters.filter((r) => r.type === 'junit' || r.type === 'json');

      const runOptions: RunOptions = {
        path: pathArg,
        collections: opts.collection as string[],
        folders: opts.folder as string[],
        environment: opts.environment as string | undefined,
        vars: opts.var as string[],
        varFile: opts.varFile as string | undefined,
        tokens: opts.token as string[],
        oauthSecrets: opts.oauthSecret as string[],
        refreshTokens: opts.refreshToken as string[],
        bail: opts.bail as boolean,
        insecure: opts.insecure as boolean,
        timeout: opts.timeout as number | undefined,
        persist: opts.persist as boolean,
        isolated: opts.isolated as string | undefined,
        onEvent: consoleReporter?.onEvent,
      };

      const result = await runCommand(runOptions);

      if (consoleReporter) {
        consoleReporter.finish(result.summary);
      }
      for (const reporter of fileReporters) {
        const build = reporter.type === 'junit' ? buildJunitReport : reporter.type === 'json' ? buildJsonReport : null;
        if (build) {
          fs.mkdirSync(path.dirname(path.resolve(reporter.file)), { recursive: true });
          fs.writeFileSync(path.resolve(reporter.file), build(result.summary), 'utf8');
          process.stderr.write(`Report written to ${path.resolve(reporter.file)}\n`);
        }
      }

      exitCode = computeExitCode(result.summary);
    });

  await program.parseAsync(process.argv);
  return exitCode;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err: unknown) => {
    if (err instanceof CliError) {
      process.stderr.write(`Error: ${err.message}\n`);
      process.exitCode = 2;
    } else if (err instanceof CliAuthError) {
      process.stderr.write(`Auth error: ${err.message}\n`);
      process.exitCode = 1;
    } else if (err instanceof CommanderError) {
      if (err.exitCode === 0) {
        // --help / --version: output has already been printed
        process.exitCode = 0;
      } else {
        process.stderr.write(`Error: ${err.message}\n`);
        process.exitCode = 2;
      }
    } else {
      process.stderr.write(`Unexpected error: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
      process.exitCode = 1;
    }
  });
