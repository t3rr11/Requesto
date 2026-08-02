import { createHash, randomUUID } from 'node:crypto';
import { buildClientSchema, buildSchema } from 'graphql';
import { AppError } from '../errors/app-error';
import type {
  CreateGraphQLSchemaProfile,
  GraphQLSchemaCacheEntry,
  GraphQLSchemaProfile,
} from '../models/graphql-schema-profile';
import { GraphQLSchemaCacheRepository } from '../repositories/graphql-schema-cache.repository';
import { GraphQLSchemaProfileRepository } from '../repositories/graphql-schema-profile.repository';

export class GraphQLSchemaProfileService {
  constructor(
    private readonly profileRepo: GraphQLSchemaProfileRepository,
    private readonly cacheRepo: GraphQLSchemaCacheRepository,
  ) {}

  getAll(): GraphQLSchemaProfile[] {
    return this.profileRepo.getAll();
  }

  getById(id: string): GraphQLSchemaProfile {
    const profile = this.profileRepo.findById(id);
    if (!profile) throw AppError.notFound('GraphQL schema profile not found');
    return profile;
  }

  create(input: CreateGraphQLSchemaProfile): GraphQLSchemaProfile {
    const validated = validateProfileInput(input);
    const now = Date.now();
    return this.profileRepo.save({
      id: `gql-schema-${randomUUID()}`,
      ...validated,
      createdAt: now,
      updatedAt: now,
    });
  }

  update(id: string, input: CreateGraphQLSchemaProfile): GraphQLSchemaProfile {
    const existing = this.getById(id);
    const validated = validateProfileInput(input);
    const sourceChanged =
      existing.sourceType !== validated.sourceType ||
      existing.sourceUrl !== validated.sourceUrl ||
      existing.contentHash !== validated.contentHash;
    const updated = this.profileRepo.save({
      id,
      ...validated,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    });
    if (sourceChanged) this.cacheRepo.delete(id);
    return updated;
  }

  delete(id: string): void {
    if (!this.profileRepo.delete(id)) {
      throw AppError.notFound('GraphQL schema profile not found');
    }
    this.cacheRepo.delete(id);
  }

  getCache(profileId: string): GraphQLSchemaCacheEntry | null {
    this.getById(profileId);
    return this.cacheRepo.get(profileId) ?? null;
  }

  saveCache(profileId: string, sourceUrl: string, introspection: unknown): GraphQLSchemaCacheEntry {
    const profile = this.getById(profileId);
    if (profile.sourceType !== 'endpoint') {
      throw AppError.badRequest('Only endpoint schema profiles use the introspection cache');
    }
    const normalized = normalizeIntrospection(introspection);
    validateIntrospection(normalized);
    return this.cacheRepo.save({
      profileId,
      sourceUrl,
      introspection: normalized,
      fetchedAt: Date.now(),
      contentHash: hashContent(JSON.stringify(normalized)),
    });
  }
}

function validateProfileInput(input: CreateGraphQLSchemaProfile): Omit<GraphQLSchemaProfile, 'id' | 'createdAt' | 'updatedAt'> {
  const name = input.name.trim();
  if (!name) throw AppError.badRequest('Schema profile name is required');

  if (input.sourceType === 'endpoint') {
    const sourceUrl = input.sourceUrl?.trim();
    if (!sourceUrl) throw AppError.badRequest('Endpoint schema profiles require a source URL');
    return { name, sourceType: 'endpoint', sourceUrl };
  }

  const content = input.content?.trim();
  if (!content) throw AppError.badRequest('Schema content is required');
  if (input.sourceType === 'sdl') {
    try {
      buildSchema(content);
    } catch (error) {
      throw AppError.badRequest(`Invalid GraphQL SDL: ${getErrorMessage(error)}`);
    }
  } else {
    const parsed = parseIntrospectionJson(content);
    validateIntrospection(parsed);
  }
  return {
    name,
    sourceType: input.sourceType,
    content,
    contentHash: hashContent(content),
  };
}

function parseIntrospectionJson(content: string): unknown {
  try {
    return normalizeIntrospection(JSON.parse(content));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw AppError.badRequest('Introspection schema content must be valid JSON');
    }
    throw error;
  }
}

function normalizeIntrospection(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) {
    throw AppError.badRequest('Invalid GraphQL introspection schema');
  }
  const envelope = value as { data?: unknown; __schema?: unknown };
  const normalized = envelope.data ?? value;
  if (typeof normalized !== 'object' || normalized === null || !(normalized as { __schema?: unknown }).__schema) {
    throw AppError.badRequest('Introspection schema does not include __schema');
  }
  return normalized;
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function validateIntrospection(value: unknown): void {
  try {
    buildClientSchema(value as Parameters<typeof buildClientSchema>[0]);
  } catch (error) {
    throw AppError.badRequest(`Invalid GraphQL introspection schema: ${getErrorMessage(error)}`);
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown validation error';
}
