import { app, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { isDev, SIMULATE_BACKEND_FAILURE, SIMULATE_UPDATE_AVAILABLE } from './constants';
import { state } from './state';
import { clearCacheOnVersionChange } from './cacheManager';
import { registerIpcHandlers } from './ipcHandlers';
import { createSplashScreen, closeSplashScreen } from './splashWindow';
import { startBackend, stopBackend, waitForBackend } from './backendManager';
import { createWindow } from './mainWindow';
import { showErrorWindow } from './errorWindow';

function setupAutoUpdater(): void {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('update-available', info => {
    state.mainWindow?.webContents.send('update:available', {
      version: info.version,
      releaseNotes: info.releaseNotes ?? null,
    });
  });

  autoUpdater.on('download-progress', progress => {
    state.mainWindow?.webContents.send('update:progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', info => {
    state.downloadedUpdatePath = info.downloadedFile ?? null;
    state.mainWindow?.webContents.send('update:downloaded');
  });

  autoUpdater.on('error', err => {
    state.mainWindow?.webContents.send('update:error', err.message);
  });
}

// App lifecycle
app.whenReady().then(async () => {
  await clearCacheOnVersionChange();

  registerIpcHandlers();
  createSplashScreen();

  if (!isDev || SIMULATE_UPDATE_AVAILABLE) {
    setupAutoUpdater();
  }

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
    state.backendReady = true;
  } else {
    // Dev mode trusts the externally-managed backend (started outside Electron via `npm run dev`),
    // so we mark it ready without probing.
    state.backendReady = true;
  }

  createWindow();

  // Close splash screen after a short delay to ensure smooth transition
  setTimeout(() => {
    closeSplashScreen();
  }, 500);

  // Check for updates after the window is ready (production only)
  if (!isDev || SIMULATE_UPDATE_AVAILABLE) {
    if (SIMULATE_UPDATE_AVAILABLE) {
      // Simulate an available update after a short delay so the window is ready
      setTimeout(() => {
        state.mainWindow?.webContents.send('update:available', {
          version: '99.0.0',
          releaseNotes: 'This is a simulated update for development testing.',
        });
      }, 2000);
    } else {
      autoUpdater.checkForUpdates().catch(err => {
        console.error('Update check failed:', err);
      });
    }
  }

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
