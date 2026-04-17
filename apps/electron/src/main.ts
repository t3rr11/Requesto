import { app, BrowserWindow, Menu, shell, dialog, ipcMain } from 'electron';
import * as path from 'path';
import { fork, ChildProcess } from 'child_process';
import * as fs from 'fs';

// Check if running in development
const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
const BACKEND_PORT = 4000;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
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
    show: false, // Don't show until ready
  });

  // Create application menu
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Request',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            mainWindow?.webContents.send('new-request');
          },
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'GitHub Repository',
          click: async () => {
            await shell.openExternal('https://github.com/t3rr11/Requesto');
          },
        },
        {
          label: 'Report Issue',
          click: async () => {
            await shell.openExternal('https://github.com/t3rr11/Requesto/issues');
          },
        },
        { type: 'separator' },
        {
          label: 'About Requesto',
          click: () => {
            const version = app.getVersion();
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'About Requesto',
              message: `Requesto v${version}`,
              detail: `A lightweight, self-hosted API client\n\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode: ${process.versions.node}`,
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Hide menu bar but keep shortcuts (Windows/Linux only)
  mainWindow.setMenuBarVisibility(false);

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the app
  if (isDev) {
    // In development, load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    const appPath = app.getAppPath();
    const indexPath = path.join(appPath, 'frontend', 'dist', 'index.html');
    console.log('Loading from:', indexPath);
    mainWindow.loadFile(indexPath);
    // Dev tools can be opened with Ctrl+Shift+I
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  if (isDev) {
    // In development, assume backend is running separately
    console.log('Development mode: Assuming backend is running on port', BACKEND_PORT);
    return;
  }

  // In production, backend is in extraResources
  const backendPath = path.join(process.resourcesPath, 'backend', 'dist', 'server.js');
  console.log('Backend path:', backendPath);
  console.log('Backend exists:', fs.existsSync(backendPath));

  if (!fs.existsSync(backendPath)) {
    console.error('Backend server.js not found at:', backendPath);
    dialog.showErrorBox('Backend Error', 'Backend server files not found. Please reinstall the application.');
    return;
  }

  // Ensure data directory exists
  const dataDir = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  backendProcess = fork(backendPath, [], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: BACKEND_PORT.toString(),
      HOST: 'localhost',
      // Set data directory to app data folder
      DATA_DIR: dataDir,
    },
    stdio: 'inherit',
  });

  backendProcess.on('error', error => {
    console.error('Backend process error:', error);
    dialog.showErrorBox('Backend Error', `Backend process failed to start: ${error.message}`);
  });

  backendProcess.on('exit', (code, signal) => {
    console.log('Backend process exited with code:', code, 'signal:', signal);
    if (code !== 0 && code !== null && !isQuitting) {
      dialog.showErrorBox(
        'Backend Crashed',
        `Backend process exited unexpectedly with code ${code}. The application may not function correctly.`
      );
    }
    backendProcess = null;
  });
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
}

function createSplashScreen() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splashWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .container {
            text-align: center;
            color: white;
          }
          .logo {
            font-size: 48px;
            font-weight: bold;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          }
          .spinner {
            margin: 20px auto;
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .message {
            font-size: 14px;
            opacity: 0.9;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">Requesto</div>
          <div class="spinner"></div>
          <div class="message">Starting backend server...</div>
        </div>
      </body>
    </html>
  `)}`
  );

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function closeSplashScreen() {
  if (splashWindow) {
    splashWindow.close();
    splashWindow = null;
  }
}

async function waitForBackend(maxAttempts = 30): Promise<boolean> {
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

// Clear Chromium cache when the app version changes
async function clearCacheOnVersionChange() {
  const versionFile = path.join(app.getPath('userData'), '.last-version');
  const currentVersion = app.getVersion();
  let lastVersion: string | null = null;

  try {
    lastVersion = fs.readFileSync(versionFile, 'utf-8').trim();
  } catch {
    // No version file yet — first run or pre-upgrade install
  }

  if (lastVersion !== currentVersion) {
    console.log(`Version changed from ${lastVersion} to ${currentVersion}, clearing cache...`);
    const session = require('electron').session;
    await session.defaultSession.clearCache();
    fs.writeFileSync(versionFile, currentVersion, 'utf-8');
  }
}

// App lifecycle
app.whenReady().then(async () => {
  await clearCacheOnVersionChange();

  // Register IPC handlers
  ipcMain.handle('select-directory', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Workspace Directory',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  if (!isDev) {
    createSplashScreen();
  }

  startBackend();

  // Wait for backend to be ready in production
  if (!isDev) {
    await waitForBackend();
  }

  createWindow();

  // Close splash screen after a short delay to ensure smooth transition
  if (!isDev) {
    setTimeout(() => {
      closeSplashScreen();
    }, 500);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    isQuitting = true;
    stopBackend();
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  stopBackend();
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  console.error('Uncaught exception:', error);
});
