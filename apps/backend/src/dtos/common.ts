import { z } from 'zod';

/**
 * Shared Zod schema fragments reused across multiple DTO files.
 */

export const formDataEntrySchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
  type: z.enum(['text', 'file']),
  fileName: z.string().optional(),
  fileContent: z.string().optional(),
  enabled: z.boolean(),
});

export const authConfigSchema = z.object({
  type: z.enum(['none', 'basic', 'bearer', 'api-key', 'digest', 'oauth']),
  basic: z.object({ username: z.string(), password: z.string() }).optional(),
  bearer: z.object({ token: z.string() }).optional(),
  apiKey: z
    .object({
      key: z.string(),
      value: z.string(),
      addTo: z.enum(['header', 'query']),
    })
    .optional(),
  digest: z.object({ username: z.string(), password: z.string() }).optional(),
  oauth: z.object({ configId: z.string() }).optional(),
});

export type AuthConfigDto = z.infer<typeof authConfigSchema>;
export type FormDataEntryDto = z.infer<typeof formDataEntrySchema>;
