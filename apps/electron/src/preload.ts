// Preload script for Electron
// Provides secure bridge between main and renderer processes

import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// specific Node.js features without exposing the entire API
contextBridge.exposeInMainWorld('electronAPI', {
  // Version information
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  
  // Platform information
  platform: process.platform,
  
  // IPC communication (for future use)
  onNewRequest: (callback: () => void) => {
    ipcRenderer.on('new-request', callback);
    return () => ipcRenderer.removeListener('new-request', callback);
  },

  // Directory picker for workspace creation
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  
  // Environment check
  isDevelopment: process.env.NODE_ENV === 'development',

  // Auto-update
  update: {
    onAvailable: (callback: (info: { version: string; releaseNotes: string | null }) => void) => {
      const listener = (_: Electron.IpcRendererEvent, info: { version: string; releaseNotes: string | null }) => callback(info);
      ipcRenderer.on('update:available', listener);
      return () => ipcRenderer.removeListener('update:available', listener);
    },
    onProgress: (callback: (progress: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => {
      const listener = (_: Electron.IpcRendererEvent, progress: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => callback(progress);
      ipcRenderer.on('update:progress', listener);
      return () => ipcRenderer.removeListener('update:progress', listener);
    },
    onDownloaded: (callback: () => void) => {
      ipcRenderer.on('update:downloaded', callback);
      return () => ipcRenderer.removeListener('update:downloaded', callback);
    },
    onError: (callback: (message: string) => void) => {
      const listener = (_: Electron.IpcRendererEvent, message: string) => callback(message);
      ipcRenderer.on('update:error', listener);
      return () => ipcRenderer.removeListener('update:error', listener);
    },
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
  },
});
