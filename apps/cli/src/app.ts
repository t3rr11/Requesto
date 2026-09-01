import { Command, CommanderError } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import { buildJunitReport } from './reporters/junit.ts';
import { buildJsonReport } from './reporters/json.ts';
import { createConsoleReporter } from './reporters/console.ts';
import { CliError } from './cli-error.ts';
import { CLI_VERSION } from './version.ts';
import { computeExitCode, runCommand, BUILTIN_SERVER_VAR } from './commands/run.ts';
import type { ReporterMode, ReporterSpec, RunResult } from './types.ts';
import type { RunnerEvent } from 'requesto-engine';

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function parseReporterSpec(spec: string): ReporterSpec {
  if (spec === 'console') return { type: 'console', mode: 'default' };
  if (spec === 'verbose') return { type: 'console', mode: 'verbose' };
  if (spec === 'dot') return { type: 'console', mode: 'dot' };
  if (spec.startsWith('junit:')) return { type: 'junit', file: spec.slice('junit:'.length) };
  if (spec.startsWith('json:')) return { type: 'json', file: spec.slice('json:'.length) };
  throw new CliError(
    `Unknown reporter "${spec}". Supported: console, verbose, dot, junit:<path>, json:<path>`,
  );
}

/** Write the junit/json report files requested on the command line. */
function writeFileReports(specs: ReporterSpec[], result: RunResult): void {
  for (const spec of specs) {
    if (spec.type !== 'junit' && spec.type !== 'json') continue;
    const content = spec.type === 'junit' ? buildJunitReport(result.summary) : buildJsonReport(result.summary);
    const target = path.resolve(spec.file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, 'utf8');
    process.stderr.write(`Report written to ${target}\n`);
  }
}

/**
 * Route usage errors (unknown flags, bad values, help/version) through the
 * catch block in bin.ts so exit codes stay consistent: 0 pass, 1 failures,
 * 2 configuration error.
 */
export async function runCli(argv: readonly string[]): Promise<number> {
  const program = new Command();
  program.exitOverride();
  let exitCode = 0;

  program
    .name('requesto')
    .description('Run your Requesto collections from the terminal and CI pipelines.')
    .version(CLI_VERSION);

  program
    .command('run', { isDefault: true })
    .description(
      'Run collections from a .requesto workspace (the default command).\n\n' +
        'PATH can be the repository root (containing .requesto), the .requesto directory itself,\n' +
        'or any directory inside them. It defaults to the current directory and walks up.\n\n' +
        'The run never touches your workspace or any server data: collections targeting the\n' +
        `{{${BUILTIN_SERVER_VAR}}} variable run against an ephemeral scratch server that the CLI\n` +
        'boots and tears down itself. Use --server to test a deployed server instead.\n\n' +
        'Exit codes: 0 = all passed, 1 = failures/errors, 2 = configuration error.',
    )
    .argument('[path]', 'repository or .requesto directory', process.cwd())
    .option('-c, --collection <name>', 'collection to run (name or id, repeatable; default: all)', collect, [])
    .option('-C, --exclude-collection <name>', 'collection to skip (name or id, repeatable; subtracts from the selection)', collect, [])
    .option('-f, --folder <name>', 'folder to run within the selected collections (name or id, repeatable)', collect, [])
    .option('-e, --environment <name>', 'environment (name or id, or "none"; default: active environment)')
    .option('--var <key=value>', 'variable override (repeatable; highest precedence)', collect, [])
    .option('--var-file <path>', '.env file providing variable overrides')
    .option('--token <configId=accessToken>', 'access token for an OAuth config, e.g. --token my-entra=eyJ... (repeatable; REQUESTO_TOKEN_* env vars work too)', collect, [])
    .option('--oauth-secret <configId=secret>', 'client secret for a non-interactive OAuth config (repeatable; REQUESTO_OAUTH_SECRET_* env vars work too)', collect, [])
    .option('--refresh-token <configId=token>', 'refresh token to seed for an OAuth config (repeatable; REQUESTO_REFRESH_TOKEN_* env vars work too)', collect, [])
    .option('-x, --bail', 'stop the run after the first failed or errored request', false)
    .option('--insecure', 'skip TLS certificate verification (self-signed certs)', false)
    .option('--timeout <ms>', 'per-request timeout in ms (default 30000)', (v: string) => {
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) throw new CliError(`Invalid --timeout value "${v}"`);
      return n;
    })
    .option('--persist', 'persist OAuth tokens acquired during the run to .requesto/local/ (default: memory only)', false)
    .option('--server <url>', 'test a deployed Requesto server instead of the embedded scratch server (its active workspace is protected by a scratch workspace)')
    .option('--reporter <spec>', 'reporter: console, verbose, dot, junit:<path> or json:<path> (repeatable; default: console)', collect, [])
    .action(async (pathArg: string, opts: Record<string, unknown>) => {
      const specs = (opts.reporter as string[]).map(parseReporterSpec);
      const consoleMode = findConsoleMode(specs);
      const consoleReporter = createConsoleReporter(consoleMode);

      const result = await runCommand({
        path: pathArg,
        collections: opts.collection as string[],
        excludeCollections: opts.excludeCollection as string[],
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
        server: opts.server as string | undefined,
        onEvent: (event: RunnerEvent) => consoleReporter.onEvent(event),
      });

      consoleReporter.finish(result.summary, {
        workspacePath: result.workspacePath,
        environmentName: result.environmentName,
        serverUrl: result.serverUrl,
      });
      writeFileReports(specs, result);

      exitCode = computeExitCode(result.summary);
    });

  await program.parseAsync(argv, { from: 'user' });
  return exitCode;
}

function findConsoleMode(specs: ReporterSpec[]): ReporterMode {
  const modes = specs.filter((s): s is Extract<ReporterSpec, { type: 'console' }> => s.type === 'console').map((s) => s.mode);
  return modes[modes.length - 1] ?? 'default';
}

export { CommanderError };
