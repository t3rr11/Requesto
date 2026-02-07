import { z } from 'zod';

export const renameSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
});

export type RenameFormData = z.infer<typeof renameSchema>;
