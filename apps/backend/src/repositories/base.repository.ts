import fs from 'fs';
import { atomicWrite, ensureDir, initializeFile } from '../utils/file';

/**
 * Base class providing common JSON-file I/O helpers for all repositories.
 */
export abstract class BaseRepository {
  /** Read and parse a JSON file. Returns `defaultValue` on any error. */
  protected readJson<T>(filePath: string, defaultValue: T): T {
    try {
      if (!fs.existsSync(filePath)) return defaultValue;
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`Error reading ${filePath}:`, error);
      return defaultValue;
    }
  }

  /** Atomically write data to a JSON file. */
  protected writeJson(filePath: string, data: unknown): void {
    atomicWrite(filePath, data);
  }

  /** Ensure a directory exists, creating it recursively if needed. */
  protected ensureDir(dirPath: string): void {
    ensureDir(dirPath);
  }

  /** Create a file with default data if it does not already exist. */
  protected initializeFile(filePath: string, defaultData: unknown): void {
    initializeFile(filePath, defaultData);
  }
}
