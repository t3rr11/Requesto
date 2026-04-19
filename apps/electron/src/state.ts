import { BrowserWindow } from 'electron';
import { ChildProcess } from 'child_process';

export const state: {
  mainWindow: BrowserWindow | null;
  splashWindow: BrowserWindow | null;
  backendProcess: ChildProcess | null;
  isQuitting: boolean;
} = {
  mainWindow: null,
  splashWindow: null,
  backendProcess: null,
  isQuitting: false,
};
