import { z } from 'zod';
import { authConfigSchema, formDataEntrySchema } from './common';

export const proxyRequestSchema = z.object({
  method: z.string().min(1, 'HTTP method is required'),
  url: z.string().min(1, 'URL is required'),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
  bodyType: z.enum(['json', 'form-data', 'x-www-form-urlencoded']).optional(),
  formDataEntries: z.array(formDataEntrySchema).optional(),
  auth: authConfigSchema.optional(),
});

/** Stream request has the same shape as a regular proxy request */
export const proxyStreamSchema = proxyRequestSchema;

export type ProxyRequestDto = z.infer<typeof proxyRequestSchema>;
export type ProxyStreamDto = z.infer<typeof proxyStreamSchema>;
