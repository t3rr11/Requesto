import path from 'path';
import { BaseRepository } from './base.repository';
import type { GraphQLSchemaCacheEntry } from '../models/graphql-schema-profile';

export class GraphQLSchemaCacheRepository extends BaseRepository {
  constructor(private readonly getLocalDir: () => string) {
    super();
  }

  private getFilePath(): string {
    return path.join(this.getLocalDir(), 'graphql-schema-cache.json');
  }

  private getAll(): Record<string, GraphQLSchemaCacheEntry> {
    return this.readJson<Record<string, GraphQLSchemaCacheEntry>>(this.getFilePath(), {});
  }

  get(profileId: string): GraphQLSchemaCacheEntry | undefined {
    return this.getAll()[profileId];
  }

  save(entry: GraphQLSchemaCacheEntry): GraphQLSchemaCacheEntry {
    const entries = this.getAll();
    entries[entry.profileId] = entry;
    this.writeJson(this.getFilePath(), entries);
    return entry;
  }

  delete(profileId: string): void {
    const entries = this.getAll();
    delete entries[profileId];
    this.writeJson(this.getFilePath(), entries);
  }
}
