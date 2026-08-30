import fs from 'node:fs';
import path from 'node:path';
import { Environment, EnvironmentsData } from '../models/environment';
import { BaseRepository } from './base.repository';
import { readOrderSection, removeIdFromOrder, writeOrderSection } from '../utils/order';
import { resolveUniqueFileName } from '../utils/slug';

/**
 * Stores one environment per file under `.requesto/environments/`, committed to
 * git with initial variable values only.
 *
 * The active environment is a per-user preference: it lives in the gitignored
 * `local/active-environment.json`. When no selection is stored (e.g. a fresh
 * clone), the first environment in the workspace order is active — users make
 * an environment "workspace default" by moving it to the top.
 */
export class EnvironmentRepository extends BaseRepository {
  constructor(
    private readonly getDataDir: () => string,
    private readonly getLocalDir: () => string,
  ) {
    super();
  }

  private getDir(): string {
    return path.join(this.getDataDir(), 'environments');
  }

  private getActiveFile(): string {
    return path.join(this.getLocalDir(), 'active-environment.json');
  }

  /** Read a single environment JSON file. Returns null for unreadable/invalid files. */
  private readEnvironmentFile(filePath: string): Environment | null {
    const parsed = this.readJson<Environment | null>(filePath, null);
    if (!parsed || typeof parsed.id !== 'string' || typeof parsed.name !== 'string') return null;
    return parsed;
  }

  /** Find the file containing the environment with the given id. */
  private findFile(id: string): { fileName: string; environment: Environment } | null {
    const dir = this.getDir();
    if (!fs.existsSync(dir)) return null;
    for (const fileName of fs.readdirSync(dir)) {
      if (!fileName.endsWith('.json')) continue;
      const environment = this.readEnvironmentFile(path.join(dir, fileName));
      if (environment && environment.id === id) return { fileName, environment };
    }
    return null;
  }

  /**
   * Write an environment to its own file, renaming the file when the
   * environment name (and therefore its slug) changed.
   */
  private writeEnvironment(environment: Environment): void {
    const dir = this.getDir();
    this.ensureDir(dir);
    const existing = this.findFile(environment.id);
    const fileName = resolveUniqueFileName(dir, environment.name, environment.id);
    this.writeJson(path.join(dir, fileName), environment);
    if (existing && existing.fileName !== fileName) {
      fs.unlinkSync(path.join(dir, existing.fileName));
    }
  }

  private appendToOrder(id: string): void {
    const ids = readOrderSection(this.getDataDir(), 'environments');
    if (!ids.includes(id)) {
      writeOrderSection(this.getDataDir(), 'environments', [...ids, id]);
    }
  }

  private readEnvironments(): Environment[] {
    const dir = this.getDir();
    const byId = new Map<string, Environment>();
    if (fs.existsSync(dir)) {
      for (const fileName of fs.readdirSync(dir)) {
        if (!fileName.endsWith('.json')) continue;
        const environment = this.readEnvironmentFile(path.join(dir, fileName));
        if (environment && !byId.has(environment.id)) byId.set(environment.id, environment);
      }
    }

    const ordered: Environment[] = [];
    const seen = new Set<string>();
    for (const id of readOrderSection(this.getDataDir(), 'environments')) {
      const environment = byId.get(id);
      if (environment) {
        ordered.push(environment);
        seen.add(id);
      }
    }
    for (const [id, environment] of byId) {
      if (!seen.has(id)) ordered.push(environment);
    }
    return ordered;
  }

  /** The stored local selection, or null when none/invalid. */
  private getLocalSelection(): string | null {
    const data = this.readJson<{ activeEnvironmentId?: string | null }>(this.getActiveFile(), {});
    return typeof data.activeEnvironmentId === 'string' ? data.activeEnvironmentId : null;
  }

  /**
   * Resolve the active environment id: the user's local selection when it
   * still exists, otherwise the first environment in the workspace order.
   */
  private resolveActiveEnvironmentId(environments: Environment[]): string | null {
    const selection = this.getLocalSelection();
    if (selection && environments.some((e) => e.id === selection)) return selection;
    return environments[0]?.id ?? null;
  }

  getAll(): EnvironmentsData {
    const environments = this.readEnvironments();
    return {
      activeEnvironmentId: this.resolveActiveEnvironmentId(environments),
      environments,
    };
  }

  save(environment: Environment): void {
    const exists = this.findFile(environment.id);
    this.writeEnvironment(environment);
    if (!exists) {
      this.appendToOrder(environment.id);
    }
  }

  delete(id: string): boolean {
    const environments = this.readEnvironments();
    const index = environments.findIndex((e) => e.id === id);
    if (index < 0) return false;
    if (environments.length === 1) return false; // Cannot delete last environment

    const found = this.findFile(id);
    if (found) fs.unlinkSync(path.join(this.getDir(), found.fileName));
    removeIdFromOrder(this.getDataDir(), id);

    // Clear a stale personal selection — resolve falls back to the first environment
    if (this.getLocalSelection() === id) {
      this.ensureDir(this.getLocalDir());
      this.writeJson(this.getActiveFile(), { activeEnvironmentId: null });
    }
    return true;
  }

  setActive(id: string): boolean {
    const exists = this.readEnvironments().some((e) => e.id === id);
    if (!exists) return false;
    this.ensureDir(this.getLocalDir());
    this.writeJson(this.getActiveFile(), { activeEnvironmentId: id });
    return true;
  }

  getActive(): Environment | null {
    const environments = this.readEnvironments();
    const activeId = this.resolveActiveEnvironmentId(environments);
    if (!activeId) return null;
    return environments.find((e) => e.id === activeId) ?? null;
  }

  findById(id: string): Environment | undefined {
    return this.findFile(id)?.environment;
  }

  /** Replace the entire environments data (used for import). */
  replaceAll(data: EnvironmentsData): void {
    const dir = this.getDir();
    this.ensureDir(dir);
    const keepIds = new Set(data.environments.map((e) => e.id));

    // Remove files for environments no longer present
    if (fs.existsSync(dir)) {
      for (const fileName of fs.readdirSync(dir)) {
        if (!fileName.endsWith('.json')) continue;
        const environment = this.readEnvironmentFile(path.join(dir, fileName));
        if (environment && !keepIds.has(environment.id)) {
          fs.unlinkSync(path.join(dir, fileName));
        }
      }
    }

    for (const environment of data.environments) {
      this.writeEnvironment(environment);
    }
    writeOrderSection(this.getDataDir(), 'environments', data.environments.map((e) => e.id));

    // Persist the active selection locally; a missing/unknown id falls back to first
    this.ensureDir(this.getLocalDir());
    this.writeJson(this.getActiveFile(), {
      activeEnvironmentId:
        data.activeEnvironmentId && keepIds.has(data.activeEnvironmentId)
          ? data.activeEnvironmentId
          : null,
    });
  }
}
