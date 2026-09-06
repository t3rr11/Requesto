import { autoUpdater } from 'electron-updater';
import { UPDATE_CHECK_MIN_INTERVAL_MS, UPDATE_CHECKS_ENABLED } from './constants';
import { state } from './state';

let lastCheckAt = 0;
let checkInFlight = false;

export function runUpdateCheck(background: boolean): void {
  // Skip while a download is in progress and avoid overlapping checks.
  if (checkInFlight || state.updateDownloading) return;
  lastCheckAt = Date.now();
  state.backgroundUpdateCheck = background;
  checkInFlight = true;
  autoUpdater
    .checkForUpdates()
    .catch(err => {
      if (background) {
        console.warn('Background update check failed:', err.message);
      } else {
        console.error('Update check failed:', err);
      }
    })
    .finally(() => {
      checkInFlight = false;
      state.backgroundUpdateCheck = false;
    });
}

// Throttled re-check when the window regains focus, for users who leave the
// app open for days and would otherwise never see a new release.
export function maybeCheckForUpdatesOnFocus(): void {
  if (!UPDATE_CHECKS_ENABLED) return;
  if (Date.now() - lastCheckAt < UPDATE_CHECK_MIN_INTERVAL_MS) return;
  runUpdateCheck(true);
}

export function setupAutoUpdater(): void {
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
    state.updateDownloading = false;
    state.mainWindow?.webContents.send('update:downloaded');
  });

  autoUpdater.on('error', err => {
    // A failed download must clear this flag, otherwise runUpdateCheck is
    // blocked for the rest of the session.
    state.updateDownloading = false;
    // Background re-checks (e.g. while offline) fail silently — only surface
    // errors from startup or user-initiated checks/downloads.
    if (state.backgroundUpdateCheck) {
      console.warn('Background update check error:', err.message);
      return;
    }
    state.mainWindow?.webContents.send('update:error', err.message);
  });
}
