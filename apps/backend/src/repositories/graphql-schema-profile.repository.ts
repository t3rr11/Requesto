import path from 'path';
import { BaseRepository } from './base.repository';
import type { GraphQLSchemaProfile } from '../models/graphql-schema-profile';

export class GraphQLSchemaProfileRepository extends BaseRepository {
  constructor(private readonly getDataDir: () => string) {
    super();
  }

  private getFilePath(): string {
    return path.join(this.getDataDir(), 'graphql-schemas.json');
  }

  getAll(): GraphQLSchemaProfile[] {
    return this.readJson<GraphQLSchemaProfile[]>(this.getFilePath(), []);
  }

  findById(id: string): GraphQLSchemaProfile | undefined {
    return this.getAll().find(profile => profile.id === id);
  }

  save(profile: GraphQLSchemaProfile): GraphQLSchemaProfile {
    const profiles = this.getAll();
    const index = profiles.findIndex(existing => existing.id === profile.id);
    if (index >= 0) profiles[index] = profile;
    else profiles.push(profile);
    this.writeJson(this.getFilePath(), profiles);
    return profile;
  }

  delete(id: string): boolean {
    const profiles = this.getAll();
    const next = profiles.filter(profile => profile.id !== id);
    if (next.length === profiles.length) return false;
    this.writeJson(this.getFilePath(), next);
    return true;
  }
}
