import fs from 'node:fs';
import path from 'node:path';
import { BaseRepository } from './base.repository';
import type { GraphQLSchemaProfile } from '../models/graphql-schema-profile';
import { readOrderSection, removeIdFromOrder, writeOrderSection } from '../utils/order';
import { resolveUniqueFileName } from '../utils/slug';

export class GraphQLSchemaProfileRepository extends BaseRepository {
  constructor(private readonly getDataDir: () => string) {
    super();
  }

  private getDir(): string {
    return path.join(this.getDataDir(), 'graphql-schemas');
  }

  /** Read a single profile JSON file. Returns null for unreadable/invalid files. */
  private readProfileFile(filePath: string): GraphQLSchemaProfile | null {
    const parsed = this.readJson<GraphQLSchemaProfile | null>(filePath, null);
    if (!parsed || typeof parsed.id !== 'string' || typeof parsed.name !== 'string') return null;
    return parsed;
  }

  /** Find the file containing the profile with the given id. */
  private findFile(id: string): { fileName: string; profile: GraphQLSchemaProfile } | null {
    const dir = this.getDir();
    if (!fs.existsSync(dir)) return null;
    for (const fileName of fs.readdirSync(dir)) {
      if (!fileName.endsWith('.json')) continue;
      const profile = this.readProfileFile(path.join(dir, fileName));
      if (profile && profile.id === id) return { fileName, profile };
    }
    return null;
  }

  /**
   * Write a profile to its own file, renaming the file when the profile name
   * (and therefore its slug) changed.
   */
  private writeProfile(profile: GraphQLSchemaProfile): void {
    const dir = this.getDir();
    this.ensureDir(dir);
    const existing = this.findFile(profile.id);
    const fileName = resolveUniqueFileName(dir, profile.name, profile.id);
    this.writeJson(path.join(dir, fileName), profile);
    if (existing && existing.fileName !== fileName) {
      fs.unlinkSync(path.join(dir, existing.fileName));
    }
  }

  private appendToOrder(id: string): void {
    const ids = readOrderSection(this.getDataDir(), 'graphqlSchemas');
    if (!ids.includes(id)) {
      writeOrderSection(this.getDataDir(), 'graphqlSchemas', [...ids, id]);
    }
  }

  getAll(): GraphQLSchemaProfile[] {
    const dir = this.getDir();
    const byId = new Map<string, GraphQLSchemaProfile>();
    if (fs.existsSync(dir)) {
      for (const fileName of fs.readdirSync(dir)) {
        if (!fileName.endsWith('.json')) continue;
        const profile = this.readProfileFile(path.join(dir, fileName));
        if (profile && !byId.has(profile.id)) byId.set(profile.id, profile);
      }
    }

    const ordered: GraphQLSchemaProfile[] = [];
    const seen = new Set<string>();
    for (const id of readOrderSection(this.getDataDir(), 'graphqlSchemas')) {
      const profile = byId.get(id);
      if (profile) {
        ordered.push(profile);
        seen.add(id);
      }
    }
    for (const [id, profile] of byId) {
      if (!seen.has(id)) ordered.push(profile);
    }
    return ordered;
  }

  findById(id: string): GraphQLSchemaProfile | undefined {
    return this.findFile(id)?.profile;
  }

  save(profile: GraphQLSchemaProfile): GraphQLSchemaProfile {
    const exists = this.findFile(profile.id);
    this.writeProfile(profile);
    if (!exists) {
      this.appendToOrder(profile.id);
    }
    return profile;
  }

  delete(id: string): boolean {
    const found = this.findFile(id);
    if (!found) return false;
    fs.unlinkSync(path.join(this.getDir(), found.fileName));
    removeIdFromOrder(this.getDataDir(), id);
    return true;
  }
}
