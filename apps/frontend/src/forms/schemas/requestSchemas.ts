import { z } from 'zod';

export const newRequestSchema = z.object({
  name: z.string().min(1, 'Request name is required').trim(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
  collectionId: z.string().min(1, 'Please select a collection'),
  folderId: z.string().optional(),
});

export type NewRequestFormData = z.infer<typeof newRequestSchema>;

export const saveRequestSchema = z.object({
  name: z.string().min(1, 'Request name is required').trim(),
  collectionId: z.string().min(1, 'Please select a collection'),
});

export type SaveRequestFormData = z.infer<typeof saveRequestSchema>;
