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
  
  // Environment check
  isDevelopment: process.env.NODE_ENV === 'development',
});
