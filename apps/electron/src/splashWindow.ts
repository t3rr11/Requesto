import { BrowserWindow, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { isDev } from './constants';
import { state } from './state';

export function createSplashScreen(): void {
  state.splashWindow = new BrowserWindow({
    width: 420,
    height: 320,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const version = app.getVersion();
  const logoPath = isDev
    ? path.join(__dirname, '../../frontend/public/logo-white.png')
    : path.join(__dirname, '../frontend/dist/logo-white.png');
  const logoDataUrl = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;

  state.splashWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: transparent;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            -webkit-app-region: drag;
            overflow: hidden;
          }
          .card {
            background: #111827;
            border-radius: 16px;
            border: 1px solid rgba(59, 130, 246, 0.15);
            padding: 44px 56px;
            text-align: center;
          }
          .logo-mark {
            width: 72px;
            height: 72px;
            margin: 0 auto 16px;
          }
          .logo-mark img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .app-name {
            font-size: 28px;
            font-weight: 700;
            color: #f9fafb;
            letter-spacing: -0.5px;
            margin-bottom: 6px;
          }
          .tagline {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 8px;
            font-weight: 400;
          }
          .version {
            font-size: 11px;
            color: #4b5563;
            margin-bottom: 24px;
            font-weight: 500;
            letter-spacing: 0.3px;
          }
          .loader-track {
            width: 180px;
            height: 3px;
            background: #1f2937;
            border-radius: 3px;
            margin: 0 auto 14px;
            overflow: hidden;
          }
          .loader-bar {
            height: 100%;
            width: 40%;
            background: linear-gradient(90deg, #3b82f6, #60a5fa);
            border-radius: 3px;
            animation: slide 1.4s ease-in-out infinite;
          }
          @keyframes slide {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(350%); }
          }
          .status {
            font-size: 11px;
            color: #4b5563;
            font-weight: 500;
            letter-spacing: 0.3px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo-mark">
            <img src="${logoDataUrl}" />
          </div>
          <div class="app-name">Requesto</div>
          <div class="tagline">Lightweight API Client</div>
          <div class="version">v${version}</div>
          <div class="loader-track">
            <div class="loader-bar"></div>
          </div>
          <div class="status">Starting up\u2026</div>
        </div>
      </body>
    </html>
  `)}`
  );

  state.splashWindow.on('closed', () => {
    state.splashWindow = null;
  });
}

export function closeSplashScreen(): void {
  if (state.splashWindow) {
    state.splashWindow.close();
    state.splashWindow = null;
  }
}
