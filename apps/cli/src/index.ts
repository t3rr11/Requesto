#!/usr/bin/env node
import { Command } from 'commander';
import path from 'node:path';
import { findRequestoDir, loadRequestoData, resolveCollection, resolveEnvironment } from './loader';
import { runCollection } from './collectionRunner';
import { createReporter } from './reporter';
import { startServer } from './serverManager';
import { generateJUnit } from './junitReporter';

const program = new Command();

program
  .name('requesto')
  .description('Requesto CI test runner')
  .version('0.1.0');

program
  .command('test')
  .description('Execute a Requesto collection against the configured application')
  .option('-e, --environment <name>', 'Environment name or ID to use')
  .option('-c, --collection <name>', 'Collection name or ID to run')
  .option('--no-server', 'Skip server lifecycle management (application already running)')
  .option('--report-junit <file>', 'Write JUnit XML results to the given file')
  .option('-v, --verbose', 'Print server output and additional details')
  .action(async (opts: {
    environment?: string;
    collection?: string;
    server: boolean; // commander --no-server inverts to server=false
    reportJunit?: string;
    verbose: boolean;
  }) => {
    const reporter = createReporter(opts.verbose);

    reporter.log('\nRequesto Test Runner\n');

    // Locate .requesto directory
    const requestoDir = findRequestoDir();
    if (!requestoDir) {
      reporter.log('ERROR: Could not find a .requesto directory. Run this command from inside a repository that contains one.');
      process.exit(2);
    }

    let data;
    try {
      data = loadRequestoData(requestoDir);
    } catch (err) {
      reporter.log(`ERROR: Failed to load .requesto configuration: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(2);
    }

    // Resolve collection
    const collectionName = opts.collection ?? data.runnerConfig.collection;
    let collection;
    try {
      collection = resolveCollection(data.collections, collectionName);
    } catch (err) {
      reporter.log(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(2);
    }

    // Resolve environment
    let env;
    try {
      env = resolveEnvironment(data.environmentsData, opts.environment);
    } catch (err) {
      reporter.log(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(2);
    }

    // Start server (unless --no-server or no server config)
    let stopServer: (() => void) | null = null;
    const serverConfig = opts.server ? data.runnerConfig.server : undefined;

    if (serverConfig) {
      reporter.log('Starting application...');
      reporter.log(`Waiting for ${serverConfig.health
        ? (serverConfig.health.startsWith('http') ? serverConfig.health : serverConfig.url.replace(/\/$/, '') + serverConfig.health)
        : serverConfig.url} ...`);

      try {
        const handle = await startServer(serverConfig, {
          onOutputLine: opts.verbose ? (line) => reporter.log(`  [server] ${line}`) : undefined,
        });
        stopServer = handle.stop;
        reporter.log('ready\n');
      } catch (err) {
        reporter.log(`\nERROR: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(2);
      }
    }

    // Run the collection
    let summary;
    try {
      summary = await runCollection(collection, env, data.oauthTokens, reporter);
    } catch (err) {
      reporter.log(`\nERROR: Unexpected runner error: ${err instanceof Error ? err.message : String(err)}`);
      stopServer?.();
      process.exit(2);
    }

    // Stop server
    if (stopServer) {
      reporter.log('\nStopping application...');
      stopServer();
    }

    // Write JUnit report
    if (opts.reportJunit) {
      const outputPath = path.resolve(opts.reportJunit);
      try {
        generateJUnit(summary, outputPath);
        reporter.log(`\nJUnit report written to ${outputPath}`);
      } catch (err) {
        reporter.log(`WARNING: Failed to write JUnit report: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Exit code: 1 = test failures, 0 = all passed
    if (summary.failed > 0) {
      reporter.log('\nERROR: Requesto tests failed\n');
      process.exit(1);
    }

    process.exit(0);
  });

program.parse(process.argv);
