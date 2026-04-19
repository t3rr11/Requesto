import { BrowserWindow, shell, app } from 'electron';
import * as path from 'path';
import { isDev } from './constants';
import { state } from './state';
import { createAppMenu } from './appMenu';

export function createWindow(): void {
  state.mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../../../frontend/public/logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#1f2937',
    show: false,
  });

  createAppMenu();

  // Hide menu bar but keep shortcuts (Windows/Linux only)
  state.mainWindow.setMenuBarVisibility(false);

  // Open external links in browser
  state.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Show window when ready
  state.mainWindow.once('ready-to-show', () => {
    state.mainWindow?.show();
  });

  // Load the app
  if (isDev) {
    state.mainWindow.loadURL('http://localhost:5173');
    state.mainWindow.webContents.openDevTools();
  } else {
    const appPath = app.getAppPath();
    const indexPath = path.join(appPath, 'frontend', 'dist', 'index.html');
    console.log('Loading from:', indexPath);
    state.mainWindow.loadFile(indexPath);
    // Dev tools can be opened with Ctrl+Shift+I
  }

  state.mainWindow.on('closed', () => {
    state.mainWindow = null;
  });
}
