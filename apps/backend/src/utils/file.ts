import fs from 'fs';
import path from 'path';

/**
 * Atomically write data to a file by writing to a temp file first,
 * then renaming it. This prevents data corruption if the process
 * dies mid-write.
 */
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

/** Create a directory and all its parents if they don't already exist. */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Create a file with default data if it doesn't already exist.
 * Also ensures the parent directory is created.
 */
export function initializeFile(filePath: string, defaultData: unknown): void {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  if (!fs.existsSync(filePath)) {
    atomicWrite(filePath, defaultData);
  }
}
