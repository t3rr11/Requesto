import { BrowserWindow, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { isDev } from './constants';

export type ErrorSeverity = 'fatal' | 'warning';

export interface ErrorOptions {
  title: string;
  message: string;
  detail?: string;
  hint?: string;
  severity?: ErrorSeverity;
}

export function showErrorWindow(options: ErrorOptions): void {
  const { title, message, detail, hint, severity = 'fatal' } = options;
  const isFatal = severity === 'fatal';

  const logoPath = isDev
    ? path.join(__dirname, '../../frontend/public/logo-white.png')
    : path.join(__dirname, '../frontend/dist/logo-white.png');

  let logoDataUrl = '';
  try {
    logoDataUrl = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
  } catch {
    // Logo not critical — window still shows without it
  }

  const errorWindow = new BrowserWindow({
    width: 480,
    height: detail ? 400 : 340,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const accentColor = isFatal ? '#ef4444' : '#f59e0b';
  const accentColorDim = isFatal ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)';
  const quitLabel = isFatal ? 'Quit Requesto' : 'Dismiss';

  errorWindow.loadURL(
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
            border: 1px solid ${accentColorDim};
            padding: 36px 48px;
            text-align: center;
            width: 100%;
          }
          .logo-mark {
            width: 48px;
            height: 48px;
            margin: 0 auto 12px;
            opacity: 0.6;
          }
          .logo-mark img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .error-icon {
            font-size: 32px;
            margin-bottom: 12px;
            line-height: 1;
          }
          .app-name {
            font-size: 13px;
            font-weight: 600;
            color: #6b7280;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-bottom: 16px;
          }
          .error-title {
            font-size: 18px;
            font-weight: 700;
            color: ${accentColor};
            margin-bottom: 10px;
            letter-spacing: -0.3px;
          }
          .error-message {
            font-size: 13px;
            color: #9ca3af;
            line-height: 1.6;
            margin-bottom: ${detail ? '10px' : '24px'};
          }
          .error-hint {
            font-size: 11px;
            color: #6b7280;
            line-height: 1.5;
            margin-bottom: 20px;
          }
          .error-detail {
            font-size: 11px;
            color: #4b5563;
            font-family: 'Consolas', 'Monaco', monospace;
            background: #0d1117;
            border: 1px solid #1f2937;
            border-radius: 8px;
            padding: 10px 14px;
            margin-bottom: 24px;
            text-align: left;
            word-break: break-all;
            line-height: 1.5;
          }
          .actions {
            display: flex;
            gap: 10px;
            justify-content: center;
            -webkit-app-region: no-drag;
          }
          .btn {
            padding: 9px 22px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            transition: opacity 0.15s;
          }
          .btn:hover { opacity: 0.85; }
          .btn-quit {
            background: ${accentColor};
            color: #fff;
          }
          .btn-copy {
            background: #1f2937;
            color: #9ca3af;
            border: 1px solid #374151;
          }
          .btn-copy.copied {
            color: #34d399;
            border-color: #34d399;
          }
        </style>
      </head>
      <body>
        <div class="card">
          ${logoDataUrl ? `<div class="logo-mark"><img src="${logoDataUrl}" /></div>` : ''}
          <div class="app-name">Requesto</div>
          <div class="error-title">${title}</div>
          <div class="error-message">${message}</div>
          ${detail ? `<div class="error-detail" id="detail">${detail}</div>` : ''}
          ${hint ? `<div class="error-hint">${hint}</div>` : ''}
          <div class="actions">
            ${detail ? `<button class="btn btn-copy" id="copyBtn">Copy Error</button>` : ''}
            <button class="btn btn-quit" id="quitBtn">${quitLabel}</button>
          </div>
        </div>
        <script>
          document.getElementById('quitBtn').addEventListener('click', () => {
            window.close();
          });
          ${detail ? `
          document.getElementById('copyBtn').addEventListener('click', () => {
            navigator.clipboard.writeText(document.getElementById('detail').textContent).then(() => {
              const btn = document.getElementById('copyBtn');
              btn.textContent = 'Copied!';
              btn.classList.add('copied');
              setTimeout(() => {
                btn.textContent = 'Copy Error';
                btn.classList.remove('copied');
              }, 2000);
            });
          });
          ` : ''}
        </script>
      </body>
    </html>
  `)}`
  );

  errorWindow.on('closed', () => {
    if (isFatal) {
      app.quit();
    }
  });
}
