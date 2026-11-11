import path from 'node:path';
import { BaseRepository } from './base.repository';
import type { EnvironmentVariableType } from '../models/environment';

/** A runtime current-value override, with the type it came in as (if known). */
export type LocalVariable = {
  value: string;
  type?: EnvironmentVariableType;
};

/**
 * Stores runtime "current values" for environment variables in a separate
 * sidecar file (`environments.local.json`) that should be gitignored.
 *
 * Shape: `{ [envId: string]: { [key: string]: string | { value: string; type?: EnvironmentVariableType } } }`
 *
 * Entries written by this version are `{ value, type? }` objects so the type
 * a script recorded survives sessions; older sidecar files hold plain
 * strings, which are read back as value-only entries (type falls back to the
 * variable's own).
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

  private read(): Record<string, Record<string, string | LocalVariable>> {
    return this.readJson<Record<string, Record<string, string | LocalVariable>>>(this.getFilePath(), {});
  }

  /** Read and normalise every entry to `{ value, type? }` (legacy strings included). */
  private readNormalized(): Record<string, Record<string, LocalVariable>> {
    const out: Record<string, Record<string, LocalVariable>> = {};
    for (const [envId, entries] of Object.entries(this.read())) {
      out[envId] = Object.fromEntries(
        Object.entries(entries).map(([key, entry]) => [key, EnvironmentLocalRepository.toEntry(entry)]),
      );
    }
    return out;
  }

  private write(data: Record<string, Record<string, LocalVariable>>): void {
    this.writeJson(this.getFilePath(), data);
  }

  /** Normalise a stored entry (legacy plain string or `{ value, type }`). */
  private static toEntry(raw: string | LocalVariable): LocalVariable {
    if (typeof raw === 'string') return { value: raw };
    return { value: raw.value, ...(raw.type !== undefined && { type: raw.type }) };
  }

  /** Get all current-value overrides for a specific environment. */
  getForEnvironment(envId: string): Record<string, LocalVariable> {
    return this.readNormalized()[envId] ?? {};
  }

  /**
   * Merge the given overrides into the stored current values for an environment.
   * Existing keys not in `overrides` are left unchanged. `types` optionally
   * records the type each value came in as; a provided type replaces the
   * stored one, an omitted type keeps it.
   */
  setForEnvironment(
    envId: string,
    overrides: Record<string, string>,
    types?: Record<string, EnvironmentVariableType>,
  ): void {
    const data = this.readNormalized();
    const existing = data[envId] ?? {};
    const merged: Record<string, LocalVariable> = { ...existing };
    for (const [key, value] of Object.entries(overrides)) {
      const previous = merged[key];
      const type = types?.[key] ?? previous?.type;
      merged[key] = { value, ...(type !== undefined && { type }) };
    }
    data[envId] = merged;
    this.write(data);
  }

  /** Reset all current values for an environment back to initial (removes the entry). */
  resetForEnvironment(envId: string): void {
    const data = this.readNormalized();
    delete data[envId];
    this.write(data);
  }

  /** Reset a single variable's current value back to initial. */
  resetVariable(envId: string, key: string): void {
    const data = this.readNormalized();
    if (data[envId]) {
      delete data[envId][key];
      if (Object.keys(data[envId]).length === 0) {
        delete data[envId];
      }
      this.write(data);
    }
  }

  /** Remove all data for a deleted environment. */
  deleteEnvironment(envId: string): void {
    this.resetForEnvironment(envId);
  }

  /** Return all stored local data (used when merging into environment responses). */
  getAll(): Record<string, Record<string, LocalVariable>> {
    return this.readNormalized();
  }
}
