import { BaseRepository } from './base.repository';
import type { EnvironmentVariableType } from '../models/environment';
import { toLocalVariable, type LocalVariable } from '../utils/local-variables';

/**
 * Base class for repositories storing runtime "current values" for variables
 * in a gitignored sidecar JSON file (e.g. `environments.local.json`,
 * `collections.local.json`).
 *
 * Shape: `{ [scope: string]: { [key: string]: string | { value: string; type?: EnvironmentVariableType } } }`
 *
 * Entries written by this version are `{ value, type? }` objects so the type
 * a script recorded survives sessions; older sidecar files hold plain
 * strings, which are read back as value-only entries.
 *
 * This keeps the initial values (in the committed data files) clean for
 * version control while still persisting script-set values across sessions.
 */
export abstract class LocalVariablesRepository extends BaseRepository {
  constructor(private readonly getFilePath: () => string) {
    super();
  }

  protected readAll(): Record<string, Record<string, LocalVariable>> {
    const raw = this.readJson<Record<string, Record<string, string | LocalVariable>>>(this.getFilePath(), {});
    return Object.fromEntries(
      Object.entries(raw).map(([scope, entries]) => [
        scope,
        Object.fromEntries(Object.entries(entries).map(([key, entry]) => [key, toLocalVariable(entry)])),
      ]),
    );
  }

  private writeAll(data: Record<string, Record<string, LocalVariable>>): void {
    this.writeJson(this.getFilePath(), data);
  }

  getForScope(scope: string): Record<string, LocalVariable> {
    return this.readAll()[scope] ?? {};
  }

  /**
   * Merge the given overrides into the stored current values for a scope.
   * Existing keys not in `overrides` are left unchanged. `types` optionally
   * records the type each value came in as; a provided type replaces the
   * stored one, an omitted type keeps it.
   */
  setForScope(
    scope: string,
    overrides: Record<string, string>,
    types?: Record<string, EnvironmentVariableType>,
  ): void {
    const data = this.readAll();
    const existing = data[scope] ?? {};
    const merged: Record<string, LocalVariable> = { ...existing };
    for (const [key, value] of Object.entries(overrides)) {
      const previous = merged[key];
      const type = types?.[key] ?? previous?.type;
      merged[key] = { value, ...(type !== undefined && { type }) };
    }
    data[scope] = merged;
    this.writeAll(data);
  }

  /** Reset all current values for a scope back to initial (removes the entry). */
  resetForScope(scope: string): void {
    const data = this.readAll();
    delete data[scope];
    this.writeAll(data);
  }

  resetVariable(scope: string, key: string): void {
    const data = this.readAll();
    if (data[scope]) {
      delete data[scope][key];
      if (Object.keys(data[scope]).length === 0) {
        delete data[scope];
      }
      this.writeAll(data);
    }
  }

  /** Remove every scope matching the predicate (used for cascading deletes). */
  removeScopes(predicate: (scope: string) => boolean): void {
    const data = this.readAll();
    const cleaned = Object.fromEntries(Object.entries(data).filter(([scope]) => !predicate(scope)));
    if (Object.keys(cleaned).length !== Object.keys(data).length) {
      this.writeAll(cleaned);
    }
  }

  /** Return all stored local data (used when merging into responses). */
  getAll(): Record<string, Record<string, LocalVariable>> {
    return this.readAll();
  }
}
