import { app, BrowserWindow } from 'electron';
import { isDev, SIMULATE_BACKEND_FAILURE } from './constants';
import { state } from './state';
import { clearCacheOnVersionChange } from './cacheManager';
import { registerIpcHandlers } from './ipcHandlers';
import { createSplashScreen, closeSplashScreen } from './splashWindow';
import { startBackend, stopBackend, waitForBackend } from './backendManager';
import { createWindow } from './mainWindow';
import { showErrorWindow } from './errorWindow';

// App lifecycle
app.whenReady().then(async () => {
  await clearCacheOnVersionChange();

  registerIpcHandlers();
  createSplashScreen();

  startBackend();

  // Wait for backend to be ready in production
  if (!isDev || SIMULATE_BACKEND_FAILURE) {
    const backendReady = SIMULATE_BACKEND_FAILURE ? false : await waitForBackend();
    if (!backendReady) {
      closeSplashScreen();
      showErrorWindow({
        title: 'Backend Timed Out',
        message: 'The backend server failed to start within the expected time. Please restart the application.',
        hint: 'If this keeps happening, try reinstalling Requesto.',
        severity: 'fatal',
      });
      return;
    }
  }

  // TODO: Remove extra delay — temporary for splash screen preview
  await new Promise(resolve => setTimeout(resolve, 3000));

  createWindow();

  // Close splash screen after a short delay to ensure smooth transition
  setTimeout(() => {
    closeSplashScreen();
  }, 500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    state.isQuitting = true;
    stopBackend();
    app.quit();
  }
});

app.on('before-quit', () => {
  state.isQuitting = true;
  stopBackend();
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  console.error('Uncaught exception:', error);
});
