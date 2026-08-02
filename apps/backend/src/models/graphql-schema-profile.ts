export type GraphQLSchemaSourceType = 'endpoint' | 'sdl' | 'introspection-json';

export type GraphQLSchemaProfile = {
  id: string;
  name: string;
  sourceType: GraphQLSchemaSourceType;
  sourceUrl?: string;
  content?: string;
  contentHash?: string;
  createdAt: number;
  updatedAt: number;
};

export type CreateGraphQLSchemaProfile = {
  name: string;
  sourceType: GraphQLSchemaSourceType;
  sourceUrl?: string;
  content?: string;
};

export type GraphQLSchemaCacheEntry = {
  profileId: string;
  sourceUrl: string;
  introspection: unknown;
  fetchedAt: number;
  contentHash: string;
};
