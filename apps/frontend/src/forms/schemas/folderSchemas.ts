import { z } from 'zod';

export const newFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').trim(),
});

export type NewFolderFormData = z.infer<typeof newFolderSchema>;
