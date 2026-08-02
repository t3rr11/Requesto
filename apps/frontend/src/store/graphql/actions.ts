import { API_BASE } from '../../helpers/api/config';
import type {
  GraphQLSchemaCacheEntry,
  GraphQLSchemaProfile,
  GraphQLSchemaProfileInput,
} from './types';

async function readError(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null) as { message?: string; error?: string } | null;
  return body?.message || body?.error || fallback;
}

export async function getGraphQLSchemaProfiles(): Promise<GraphQLSchemaProfile[]> {
  const response = await fetch(`${API_BASE}/graphql/schema-profiles`);
  if (!response.ok) throw new Error(await readError(response, 'Failed to load GraphQL schema profiles'));
  return response.json();
}

export async function createGraphQLSchemaProfile(input: GraphQLSchemaProfileInput): Promise<GraphQLSchemaProfile> {
  const response = await fetch(`${API_BASE}/graphql/schema-profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await readError(response, 'Failed to create GraphQL schema profile'));
  return response.json();
}

export async function updateGraphQLSchemaProfile(
  id: string,
  input: GraphQLSchemaProfileInput,
): Promise<GraphQLSchemaProfile> {
  const response = await fetch(`${API_BASE}/graphql/schema-profiles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await readError(response, 'Failed to update GraphQL schema profile'));
  return response.json();
}

export async function deleteGraphQLSchemaProfile(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/graphql/schema-profiles/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(await readError(response, 'Failed to delete GraphQL schema profile'));
}

export async function getGraphQLSchemaCache(id: string): Promise<GraphQLSchemaCacheEntry | null> {
  const response = await fetch(`${API_BASE}/graphql/schema-profiles/${id}/cache`);
  if (!response.ok) throw new Error(await readError(response, 'Failed to load GraphQL schema cache'));
  const body = await response.json() as { cache: GraphQLSchemaCacheEntry | null };
  return body.cache;
}

export async function saveGraphQLSchemaCache(
  id: string,
  sourceUrl: string,
  introspection: unknown,
): Promise<GraphQLSchemaCacheEntry> {
  const response = await fetch(`${API_BASE}/graphql/schema-profiles/${id}/cache`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceUrl, introspection }),
  });
  if (!response.ok) throw new Error(await readError(response, 'Failed to save GraphQL schema cache'));
  const body = await response.json() as { cache: GraphQLSchemaCacheEntry };
  return body.cache;
}
