import { app } from 'electron';
import { fork } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { state } from './state';
import { showErrorWindow } from './errorWindow';
import { shouldShowBackendCrashDialog } from './backendExitDecision';
import { isDev, BACKEND_PORT, BACKEND_STARTUP_TIMEOUT_MS } from './constants';

async function probeBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${BACKEND_PORT}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

function showBackendCrashWindow(code: number | null, signal: NodeJS.Signals | null): void {
  const signalText = signal ? ` | Signal: ${signal}` : '';
  showErrorWindow({
    title: 'Backend Crashed',
    message: 'The backend process exited unexpectedly. Please restart the application.',
    detail: `Exit code: ${code}${signalText}`,
    severity: 'fatal',
  });
}

export function startBackend(): void {
  if (isDev) {
    console.log('Development mode: Assuming backend is running on port', BACKEND_PORT);
    return;
  }

  const backendPath = path.join(process.resourcesPath, 'backend', 'dist', 'server.js');
  console.log('Backend path:', backendPath);
  console.log('Backend exists:', fs.existsSync(backendPath));

  if (!fs.existsSync(backendPath)) {
    console.error('Backend server.js not found at:', backendPath);
    showErrorWindow({
      title: 'Backend Not Found',
      message: 'The backend server files could not be located. Please reinstall the application.',
      detail: backendPath,
      severity: 'fatal',
    });
    return;
  }

  // Ensure data directory exists
  const dataDir = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  state.backendProcess = fork(backendPath, [], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: BACKEND_PORT.toString(),
      HOST: 'localhost',
      DATA_DIR: dataDir,
    },
    stdio: 'inherit',
  });

  state.backendProcess.on('error', error => {
    console.error('Backend process error:', error);

    // Stop the readiness wait loop; the fork never spawned.
    state.backendProcess = null;

    showErrorWindow({
      title: 'Backend Failed to Start',
      message: 'The backend process encountered an error and could not start.',
      detail: error.message,
      severity: 'fatal',
    });
  });

  state.backendProcess.on('exit', (code, signal) => {
    console.log('Backend process exited with code:', code, 'signal:', signal);

    // Stop the readiness wait loop; the backend process is no longer running.
    state.backendProcess = null;

    // Decide synchronously when possible; otherwise re-probe health and decide.
    if (state.backendReady) {
      void probeBackendHealth().then(healthCheckOk => {
        if (
          shouldShowBackendCrashDialog({
            exitCode: code,
            isQuitting: state.isQuitting,
            backendReady: true,
            healthCheckOk,
          })
        ) {
          state.backendReady = false;
          showBackendCrashWindow(code, signal);
        } else {
          console.log('Backend exit ignored: a healthy server is still responding.');
        }
      });
      return;
    }

    // Any exit before the server was ready is a startup failure.
    if (!state.isQuitting) {
      showBackendCrashWindow(code, signal);
    }
  });
}

export function stopBackend(): void {
  if (state.backendProcess) {
    state.backendProcess.kill();
    state.backendProcess = null;
  }
  state.backendReady = false;
}

const POLL_INTERVAL_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pollBackend(elapsedMs: number, timeoutMs: number): Promise<boolean> {
  if (await probeBackendHealth()) {
    console.log('Backend is ready!');
    return true;
  }

  // The process died, its exit handler shows the error window, so stop waiting.
  if (!isDev && !state.backendProcess) {
    console.error('Backend process exited before becoming ready');
    return false;
  }

  if (elapsedMs > 0 && elapsedMs % 10_000 === 0) {
    console.log(`Still waiting for backend to start... ${elapsedMs / 1000}s`);
  }

  if (elapsedMs + POLL_INTERVAL_MS >= timeoutMs) {
    console.error('Backend failed to start within timeout');
    return false;
  }

  await sleep(POLL_INTERVAL_MS);
  return pollBackend(elapsedMs + POLL_INTERVAL_MS, timeoutMs);
}

export function waitForBackend(
  timeoutMs: number = BACKEND_STARTUP_TIMEOUT_MS,
): Promise<boolean> {
  return pollBackend(0, timeoutMs);
}
