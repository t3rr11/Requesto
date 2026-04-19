import { ipcMain, dialog } from 'electron';
import { state } from './state';

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
}
