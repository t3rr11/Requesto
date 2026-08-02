import { buildClientSchema, buildSchema, introspectionFromSchema, type GraphQLSchema } from 'graphql';
import type { GraphQLSchemaCacheEntry, GraphQLSchemaProfile } from '../store/graphql/types';

export function buildSchemaFromProfile(
  profile: GraphQLSchemaProfile,
  cache?: GraphQLSchemaCacheEntry | null,
): GraphQLSchema | null {
  if (profile.sourceType === 'endpoint') {
    return cache ? buildClientSchema(normalizeIntrospection(cache.introspection)) : null;
  }
  if (!profile.content) throw new Error('Schema profile content is empty');
  if (profile.sourceType === 'sdl') return buildSchema(profile.content);
  return buildClientSchema(normalizeIntrospection(JSON.parse(profile.content)));
}

export function serializeSchemaIntrospection(schema: GraphQLSchema): unknown {
  return introspectionFromSchema(schema, { descriptions: true, schemaDescription: true });
}

function normalizeIntrospection(value: unknown): Parameters<typeof buildClientSchema>[0] {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Invalid GraphQL introspection schema');
  }
  const envelope = value as { data?: unknown };
  return (envelope.data ?? value) as Parameters<typeof buildClientSchema>[0];
}
