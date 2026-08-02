import { z } from 'zod';

export const graphqlSchemaProfileInputSchema = z.object({
  name: z.string().trim().min(1, 'Schema profile name is required'),
  sourceType: z.enum(['endpoint', 'sdl', 'introspection-json']),
  sourceUrl: z.string().optional(),
  content: z.string().optional(),
});

export const graphqlSchemaCacheInputSchema = z.object({
  sourceUrl: z.string().min(1, 'Schema source URL is required'),
  introspection: z.unknown(),
});
