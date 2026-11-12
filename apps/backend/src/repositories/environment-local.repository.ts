import path from 'node:path';
import { LocalVariablesRepository } from './local-variables.repository';
import type { EnvironmentVariableType } from '../models/environment';
import type { LocalVariable } from '../utils/local-variables';

/**
 * Stores runtime "current values" for environment variables in the
 * `environments.local.json` sidecar file (gitignored).
 */
export class EnvironmentLocalRepository extends LocalVariablesRepository {
  constructor(getLocalDir: () => string) {
    super(() => path.join(getLocalDir(), 'environments.local.json'));
  }

  /** Get all current-value overrides for a specific environment. */
  getForEnvironment(envId: string): Record<string, LocalVariable> {
    return this.getForScope(envId);
  }

  /** Merge overrides into the stored current values for an environment. */
  setForEnvironment(
    envId: string,
    overrides: Record<string, string>,
    types?: Record<string, EnvironmentVariableType>,
  ): void {
    this.setForScope(envId, overrides, types);
  }

  /** Reset all current values for an environment back to initial (removes the entry). */
  resetForEnvironment(envId: string): void {
    this.resetForScope(envId);
  }

  /** Remove all data for a deleted environment. */
  deleteEnvironment(envId: string): void {
    this.resetForScope(envId);
  }
}
