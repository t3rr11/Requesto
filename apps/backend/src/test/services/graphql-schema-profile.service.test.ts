import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { graphqlSync, getIntrospectionQuery, GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { GraphQLSchemaCacheRepository } from '../../repositories/graphql-schema-cache.repository';
import { GraphQLSchemaProfileRepository } from '../../repositories/graphql-schema-profile.repository';
import { GraphQLSchemaProfileService } from '../../services/graphql-schema-profile.service';

describe('GraphQLSchemaProfileService', () => {
  let sharedDir: string;
  let localDir: string;
  let service: GraphQLSchemaProfileService;

  beforeEach(() => {
    sharedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'requesto-gql-shared-'));
    localDir = fs.mkdtempSync(path.join(os.tmpdir(), 'requesto-gql-local-'));
    service = new GraphQLSchemaProfileService(
      new GraphQLSchemaProfileRepository(() => sharedDir),
      new GraphQLSchemaCacheRepository(() => localDir),
    );
  });

  afterEach(() => {
    fs.rmSync(sharedDir, { recursive: true, force: true });
    fs.rmSync(localDir, { recursive: true, force: true });
  });

  /** Concatenated content of every committed schema profile file. */
  function readSharedSchemas(): string {
    const dir = path.join(sharedDir, 'graphql-schemas');
    if (!fs.existsSync(dir)) return '';
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'))
      .join('\n');
  }

  it('persists endpoint profiles without fetched schema data', () => {
    const profile = service.create({
      name: 'Production API',
      sourceType: 'endpoint',
      sourceUrl: 'https://api.example.com/graphql',
    });

    expect(service.getById(profile.id)).toMatchObject({
      name: 'Production API',
      sourceType: 'endpoint',
      sourceUrl: 'https://api.example.com/graphql',
    });
    expect(readSharedSchemas()).not.toContain('__schema');
  });

  it('validates and persists SDL profiles', () => {
    const profile = service.create({
      name: 'Local schema',
      sourceType: 'sdl',
      content: 'type Query { greeting: String! }',
    });

    expect(profile.contentHash).toHaveLength(64);
    expect(() => service.create({ name: 'Invalid', sourceType: 'sdl', content: 'type Query {' })).toThrow();
  });

  it('validates introspection JSON profiles', () => {
    const introspection = createIntrospection();
    const profile = service.create({
      name: 'Imported schema',
      sourceType: 'introspection-json',
      content: JSON.stringify(introspection),
    });

    expect(profile.sourceType).toBe('introspection-json');
    expect(() => service.create({
      name: 'Invalid JSON',
      sourceType: 'introspection-json',
      content: '{',
    })).toThrow('Introspection schema content must be valid JSON');
  });

  it('stores endpoint introspection only in the local cache', () => {
    const profile = service.create({
      name: 'Production API',
      sourceType: 'endpoint',
      sourceUrl: 'https://api.example.com/graphql',
    });
    service.saveCache(profile.id, 'https://api.example.com/graphql', createIntrospection());

    expect(service.getCache(profile.id)?.introspection).toHaveProperty('__schema');
    expect(fs.existsSync(path.join(localDir, 'graphql-schema-cache.json'))).toBe(true);
    expect(readSharedSchemas()).not.toContain('__schema');
  });

  it('invalidates local cache when an endpoint source changes', () => {
    const profile = service.create({
      name: 'Production API',
      sourceType: 'endpoint',
      sourceUrl: 'https://api.example.com/graphql',
    });
    service.saveCache(profile.id, profile.sourceUrl!, createIntrospection());

    service.update(profile.id, {
      name: profile.name,
      sourceType: 'endpoint',
      sourceUrl: 'https://api.example.com/v2/graphql',
    });

    expect(service.getCache(profile.id)).toBeNull();
  });
});

function createIntrospection() {
  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: { greeting: { type: GraphQLString } },
    }),
  });
  const result = graphqlSync({ schema, source: getIntrospectionQuery() });
  if (!result.data) throw new Error('Failed to create introspection fixture');
  return result.data;
}
