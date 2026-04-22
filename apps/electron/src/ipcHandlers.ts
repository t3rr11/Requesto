import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
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

  ipcMain.handle('update:install', async () => {
    if (process.platform === 'darwin') {
      // macOS requires code signing for silent in-place updates. Since this app
      // is unsigned, quitAndInstall() will silently fail. Instead, show the user
      // where the downloaded file is and direct them to install it manually.
      const downloadedFile = state.downloadedUpdatePath;
      const buttons = downloadedFile
        ? ['Show in Finder', 'Open Releases Page', 'Cancel']
        : ['Open Releases Page', 'Cancel'];

      const { response } = await dialog.showMessageBox({
        type: 'info',
        title: 'Manual Installation Required',
        message: 'Automatic updates require the app to be signed.',
        detail: downloadedFile
          ? 'The update has been downloaded. Open it in Finder, drag the new Requesto.app into your Applications folder, and relaunch.'
          : 'Please download the latest version from the releases page and drag it into your Applications folder.',
        buttons,
        defaultId: 0,
        cancelId: buttons.length - 1,
      });

      if (downloadedFile && response === 0) {
        shell.showItemInFolder(downloadedFile);
      } else if (response === (downloadedFile ? 1 : 0)) {
        shell.openExternal('https://github.com/t3rr11/Requesto/releases/latest');
      }
      return;
    }

    autoUpdater.quitAndInstall();
  });

  // OAuth: open a child BrowserWindow for the OAuth flow, intercept the redirect
  // back to our callback URL, and return the full callback URL to the renderer.
  ipcMain.handle('oauth:open-window', (_event, authUrl: string, callbackUrlPrefix: string): Promise<string | null> => {
    return new Promise<string | null>(resolve => {
      const oauthWindow = new BrowserWindow({
        width: 520,
        height: 720,
        parent: state.mainWindow ?? undefined,
        modal: false,
        title: 'Sign In',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      let resolved = false;
      const resolveOnce = (url: string | null) => {
        if (!resolved) {
          resolved = true;
          resolve(url);
        }
      };

      const handleNavigation = (_e: Electron.Event, url: string) => {
        if (url.startsWith(callbackUrlPrefix)) {
          oauthWindow.close();
          resolveOnce(url);
        }
      };

      oauthWindow.webContents.on('will-redirect', handleNavigation);
      oauthWindow.webContents.on('will-navigate', handleNavigation);
      oauthWindow.on('closed', () => resolveOnce(null));

      oauthWindow.loadURL(authUrl);
    });
  });
}
