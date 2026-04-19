import { ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import { SIMULATE_UPDATE_AVAILABLE } from './constants';
import { state } from './state';

function simulateDownload(): void {
  let percent = 0;
  const total = 50 * 1024 * 1024; // fake 50 MB
  const interval = setInterval(() => {
    percent += 10;
    state.mainWindow?.webContents.send('update:progress', {
      percent,
      bytesPerSecond: 5 * 1024 * 1024,
      transferred: Math.floor((percent / 100) * total),
      total,
    });
    if (percent >= 100) {
      clearInterval(interval);
      state.mainWindow?.webContents.send('update:downloaded');
    }
  }, 400);
}

export function registerIpcHandlers(): void {
  ipcMain.handle('select-directory', async () => {
    if (!state.mainWindow) return null;
    const result = await dialog.showOpenDialog(state.mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Workspace Directory',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('update:download', () => {
    if (SIMULATE_UPDATE_AVAILABLE) {
      simulateDownload();
      return;
    }
    return autoUpdater.downloadUpdate();
  });

  ipcMain.handle('update:install', () => {
    if (SIMULATE_UPDATE_AVAILABLE) return;
    autoUpdater.quitAndInstall();
  });
}
