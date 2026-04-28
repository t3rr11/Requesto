/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ElectronUpdateAPI {
  onAvailable: (callback: (info: { version: string; releaseNotes: string | null }) => void) => () => void;
  onProgress: (callback: (progress: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => () => void;
  onDownloaded: (callback: () => void) => () => void;
  onError: (callback: (message: string) => void) => () => void;
  download: () => Promise<void>;
  install: () => void;
}

interface ElectronAPI {
  versions: { electron: string; chrome: string; node: string };
  platform: string;
  onNewRequest: (callback: () => void) => () => void;
  selectDirectory: () => Promise<string | null>;
  isDevelopment: boolean;
  update: ElectronUpdateAPI;
  onWindowFocus: (callback: () => void) => () => void;
  onWindowBlur: (callback: () => void) => () => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}
