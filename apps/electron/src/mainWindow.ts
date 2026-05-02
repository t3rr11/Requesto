import { BrowserWindow, shell, app } from 'electron';
import * as path from 'path';
import { isDev } from './constants';
import { state } from './state';
import { createAppMenu } from './appMenu';
import { getInitialWindowState, attachWindowStateHandler } from './windowStateManager';

export function createWindow(): void {
  const windowState = getInitialWindowState();

  state.mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    ...(windowState.hasPosition ? { x: windowState.x, y: windowState.y } : {}),
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

  // Persist size/position changes
  attachWindowStateHandler(state.mainWindow);

  // Show window when ready, restoring maximized state if applicable
  state.mainWindow.once('ready-to-show', () => {
    if (windowState.isMaximized) {
      state.mainWindow?.maximize();
    }
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

  state.mainWindow.on('blur', () => {
    state.mainWindow?.webContents.send('window:blur');
  });

  state.mainWindow.on('focus', () => {
    state.mainWindow?.webContents.send('window:focus');
  });
}
