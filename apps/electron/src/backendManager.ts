import { app } from 'electron';
import { fork } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { isDev, BACKEND_PORT } from './constants';
import { state } from './state';
import { showErrorWindow } from './errorWindow';

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
    showErrorWindow({
      title: 'Backend Failed to Start',
      message: 'The backend process encountered an error and could not start.',
      detail: error.message,
      severity: 'fatal',
    });
  });

  state.backendProcess.on('exit', (code, signal) => {
    console.log('Backend process exited with code:', code, 'signal:', signal);
    if (code !== 0 && code !== null && !state.isQuitting) {
      showErrorWindow({
        title: 'Backend Crashed',
        message: 'The backend process exited unexpectedly. Please restart the application.',
        detail: `Exit code: ${code}${signal ? `  |  Signal: ${signal}` : ''}`,
        severity: 'fatal',
      });
    }
    state.backendProcess = null;
  });
}

export function stopBackend(): void {
  if (state.backendProcess) {
    state.backendProcess.kill();
    state.backendProcess = null;
  }
}

export async function waitForBackend(maxAttempts = 30): Promise<boolean> {
  const checkBackend = async () => {
    try {
      const response = await fetch(`http://localhost:${BACKEND_PORT}/health`);
      return response.ok;
    } catch {
      return false;
    }
  };

  for (let i = 0; i < maxAttempts; i++) {
    if (await checkBackend()) {
      console.log('Backend is ready!');
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.error('Backend failed to start within timeout');
  return false;
}
