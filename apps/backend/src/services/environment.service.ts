import { EnvironmentRepository } from '../repositories/environment.repository';
import { EnvironmentLocalRepository, type LocalVariable } from '../repositories/environment-local.repository';
import { substituteInAuth, substituteInRequest } from '../utils/variable-substitution';
import { AppError } from '../errors/app-error';
import type { Environment, EnvironmentVariable, EnvironmentVariableType, EnvironmentsData } from '../models/environment';
import type { AuthConfig, ProxyRequest } from '../models/proxy';

export class EnvironmentService {
  constructor(
    private readonly repo: EnvironmentRepository,
    private readonly localRepo?: EnvironmentLocalRepository,
  ) {}

  /** Merge current values (and their recorded types) from the local sidecar into an environment's variables. */
  private mergeCurrentValues(env: Environment): Environment {
    if (!this.localRepo) return env;
    const overrides = this.localRepo.getForEnvironment(env.id);
    if (Object.keys(overrides).length === 0) return env;
    const withType = (v: EnvironmentVariable, entry: LocalVariable): EnvironmentVariable =>
      entry.type !== undefined ? { ...v, currentValue: entry.value, type: entry.type } : { ...v, currentValue: entry.value };
    const variables = env.variables.map((v) => {
      const entry = overrides[v.key];
      return entry ? withType(v, entry) : v;
    });
    for (const [key, entry] of Object.entries(overrides)) {
      if (!variables.some((v) => v.key === key)) {
        variables.push({ key, value: '', currentValue: entry.value, enabled: true, ...(entry.type !== undefined && { type: entry.type }) });
      }
    }
    return {
      ...env,
      variables,
    };
  }

  getAll(): EnvironmentsData {
    const data = this.repo.getAll();
    return {
      ...data,
      environments: data.environments.map((e) => this.mergeCurrentValues(e)),
    };
  }

  getActive(): Environment | null {
    const env = this.repo.getActive();
    return env ? this.mergeCurrentValues(env) : null;
  }

  findById(id: string): Environment | undefined {
    const env = this.repo.findById(id);
    return env ? this.mergeCurrentValues(env) : undefined;
  }

  /**
   * Save initial values. `currentValue` is stripped before writing so the
   * committed file stays clean.
   */
  save(environment: Environment): Environment {
    const cleanVars: EnvironmentVariable[] = environment.variables.map(
      ({ currentValue: _stripped, ...rest }) => rest,
    );
    const clean = { ...environment, variables: cleanVars };
    this.repo.save(clean);
    return this.mergeCurrentValues(clean);
  }

  delete(id: string): void {
    const success = this.repo.delete(id);
    if (!success) {
      throw AppError.badRequest('Cannot delete the last remaining environment');
    }
    this.localRepo?.deleteEnvironment(id);
  }

  setActive(id: string): void {
    const success = this.repo.setActive(id);
    if (!success) {
      throw AppError.notFound('Environment not found');
    }
  }

  replaceAll(data: EnvironmentsData): void {
    this.repo.replaceAll(data);
  }

  /**
   * Persist current-value overrides to the local sidecar file.
   * Called by pre-request scripts via `environment.set()`. `types` optionally
   * records the type each value came in as (from the script sandbox).
   */
  setCurrentValues(
    envId: string,
    overrides: Record<string, string>,
    types?: Record<string, EnvironmentVariableType>,
  ): void {
    const env = this.repo.findById(envId);
    if (!env) throw AppError.notFound('Environment not found');
    this.localRepo?.setForEnvironment(envId, overrides, types);
  }

  /** Reset all current values for an environment back to their initial values. */
  resetCurrentValues(envId: string): void {
    this.localRepo?.resetForEnvironment(envId);
  }

  /** Reset a single variable's current value. */
  resetCurrentValue(envId: string, key: string): void {
    this.localRepo?.resetVariable(envId, key);
  }

  substituteInRequest(partialRequest: Pick<ProxyRequest, 'url' | 'headers' | 'body' | 'bodyType' | 'formDataEntries'>): Pick<ProxyRequest, 'url' | 'headers' | 'body' | 'bodyType' | 'formDataEntries'> {
    const active = this.getActive();
    return substituteInRequest(partialRequest, active);
  }

  substituteInAuth(auth: AuthConfig | undefined): AuthConfig | undefined {
    const active = this.getActive();
    return substituteInAuth(auth, active);
  }
}
