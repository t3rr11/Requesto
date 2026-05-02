import path from 'path';
import { BaseRepository } from './base.repository';

/**
 * Stores runtime "current values" for environment variables in a separate
 * sidecar file (`environments.local.json`) that should be gitignored.
 *
 * Shape: `{ [envId: string]: { [key: string]: string } }`
 *
 * This keeps the initial values (in `environments.json`) clean for version
 * control while still persisting script-set values across sessions.
 */
export class EnvironmentLocalRepository extends BaseRepository {
  constructor(private readonly getDataDir: () => string) {
    super();
  }

  private getFilePath(): string {
    return path.join(this.getDataDir(), 'environments.local.json');
  }

  private read(): Record<string, Record<string, string>> {
    return this.readJson<Record<string, Record<string, string>>>(this.getFilePath(), {});
  }

  private write(data: Record<string, Record<string, string>>): void {
    this.writeJson(this.getFilePath(), data);
  }

  /** Get all current-value overrides for a specific environment. */
  getForEnvironment(envId: string): Record<string, string> {
    return this.read()[envId] ?? {};
  }

  /**
   * Merge the given overrides into the stored current values for an environment.
   * Existing keys not in `overrides` are left unchanged.
   */
  setForEnvironment(envId: string, overrides: Record<string, string>): void {
    const data = this.read();
    data[envId] = { ...(data[envId] ?? {}), ...overrides };
    this.write(data);
  }

  /** Reset all current values for an environment back to initial (removes the entry). */
  resetForEnvironment(envId: string): void {
    const data = this.read();
    delete data[envId];
    this.write(data);
  }

  /** Reset a single variable's current value back to initial. */
  resetVariable(envId: string, key: string): void {
    const data = this.read();
    if (data[envId]) {
      delete data[envId][key];
      if (Object.keys(data[envId]).length === 0) {
        delete data[envId];
      }
    }
    this.write(data);
  }

  /** Remove all data for a deleted environment. */
  deleteEnvironment(envId: string): void {
    this.resetForEnvironment(envId);
  }

  /** Return all stored local data (used when merging into environment responses). */
  getAll(): Record<string, Record<string, string>> {
    return this.read();
  }
}
