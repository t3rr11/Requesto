import fs from 'fs';

export function atomicWrite(filePath: string, data: unknown): void {
  const tempFile = `${filePath}.tmp`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, filePath);
  } catch (error) {
    if (fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }
    throw error;
  }
}

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function initializeFile(filePath: string, defaultData: unknown): void {
  const dir = filePath.substring(0, filePath.lastIndexOf('/')) || filePath.substring(0, filePath.lastIndexOf('\\'));
  ensureDir(dir);
  if (!fs.existsSync(filePath)) {
    atomicWrite(filePath, defaultData);
  }
}
