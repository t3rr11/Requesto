#!/usr/bin/env node
import { CommanderError } from 'commander';
import { runCli } from './app.ts';
import { CliAuthError, CliError } from './cli-error.ts';

/**
 * Exit code convention: 0 = all passed, 1 = failures/errors (including auth),
 * 2 = configuration error (bad flags, unknown names, missing workspace).
 */
async function main(): Promise<void> {
  try {
    const exitCode = await runCli(process.argv.slice(2));
    process.exitCode = exitCode;
  } catch (err: unknown) {
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
      process.stderr.write(
        `Unexpected error: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
      );
      process.exitCode = 1;
    }
  }
}

main();
