import { spawn, type ChildProcess } from 'node:child_process';
import axios from 'axios';
import type { ServerConfig } from './types';

const DEFAULT_STARTUP_TIMEOUT_MS = 60_000;
const DEFAULT_POLL_INTERVAL_MS = 500;
const HEALTH_CHECK_TIMEOUT_MS = 3_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveHealthUrl(config: ServerConfig): string | null {
  if (!config.health) return null;
  if (config.health.startsWith('http://') || config.health.startsWith('https://')) {
    return config.health;
  }
  // Relative path — resolve against server URL
  const base = config.url.replace(/\/$/, '');
  const relative = config.health.startsWith('/') ? config.health : `/${config.health}`;
  return `${base}${relative}`;
}

function killProcess(child: ChildProcess): void {
  if (child.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    try {
      // Kill the entire process group so child processes are cleaned up too
      process.kill(-(child.pid!), 'SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
  }
}

export interface ServerHandle {
  stop: () => void;
  getOutputLines: () => string[];
}

export interface StartServerOptions {
  onOutputLine?: (line: string) => void;
}

export async function startServer(
  config: ServerConfig,
  options: StartServerOptions = {},
): Promise<ServerHandle> {
  const startupTimeout = config.startupTimeout ?? DEFAULT_STARTUP_TIMEOUT_MS;
  const pollInterval = config.pollInterval ?? DEFAULT_POLL_INTERVAL_MS;
  const healthUrl = resolveHealthUrl(config) ?? config.url;

  const outputLines: string[] = [];
  let processExited = false;
  let exitCode: number | null = null;

  const child = spawn(config.command, [], {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  });

  function appendLine(line: string): void {
    outputLines.push(line);
    options.onOutputLine?.(line);
  }

  child.stdout?.on('data', (chunk: Buffer) => {
    for (const line of chunk.toString().split('\n')) {
      if (line.trim()) appendLine(line.trimEnd());
    }
  });

  child.stderr?.on('data', (chunk: Buffer) => {
    for (const line of chunk.toString().split('\n')) {
      if (line.trim()) appendLine(line.trimEnd());
    }
  });

  child.on('exit', (code) => {
    processExited = true;
    exitCode = code;
  });

  // Register cleanup so the server is always killed on CLI exit
  const cleanup = () => killProcess(child);
  process.once('exit', cleanup);
  process.once('SIGINT', () => { cleanup(); process.exit(130); });
  process.once('SIGTERM', () => { cleanup(); process.exit(143); });

  // Poll health endpoint until ready or timeout
  const deadline = Date.now() + startupTimeout;
  while (Date.now() < deadline) {
    if (processExited) {
      const lastLines = outputLines.slice(-30).map((l) => `  ${l}`).join('\n');
      throw new Error(
        `Application process exited prematurely with code ${exitCode ?? 1}.\n\nOutput:\n${lastLines}`,
      );
    }

    try {
      const res = await axios.get(healthUrl, {
        timeout: HEALTH_CHECK_TIMEOUT_MS,
        validateStatus: () => true, // any response = server is up
      });
      if (res.status >= 200 && res.status < 600) {
        // Server is responding
        return {
          stop: cleanup,
          getOutputLines: () => [...outputLines],
        };
      }
    } catch (err) {
      // ECONNREFUSED / ENOTFOUND / ETIMEDOUT — keep polling
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ECONNREFUSED' && code !== 'ENOTFOUND' && code !== 'ECONNRESET' && code !== 'ETIMEDOUT') {
        // Unexpected error — keep going anyway, it may still start
      }
    }

    await sleep(pollInterval);
  }

  cleanup();
  const lastLines = outputLines.slice(-30).map((l) => `  ${l}`).join('\n');
  throw new Error(
    `Application failed to become ready within ${startupTimeout / 1000}s.\n\nOutput:\n${lastLines}`,
  );
}
