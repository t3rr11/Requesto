import { z } from 'zod';

export const newCollectionSchema = z.object({
  name: z.string().min(1, 'Collection name is required').trim(),
});

export type NewCollectionFormData = z.infer<typeof newCollectionSchema>;
