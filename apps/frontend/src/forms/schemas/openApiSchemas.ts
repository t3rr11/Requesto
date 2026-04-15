import { z } from 'zod';

export const importOpenApiSchema = z.object({
  source: z.string().min(1, 'Spec source is required').trim(),
  name: z.string().optional(),
  linkSpec: z.boolean().optional(),
});

export type ImportOpenApiFormData = z.infer<typeof importOpenApiSchema>;
