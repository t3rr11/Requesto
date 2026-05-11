import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').trim(),
  cloneFromRepo: z.boolean().optional(),
  repoUrl: z.string().optional(),
  authToken: z.string().optional(),
  openExisting: z.boolean().optional(),
  existingPath: z.string().optional(),
}).refine(
  (data) => !data.cloneFromRepo || (data.repoUrl && data.repoUrl.trim().length > 0),
  { message: 'Repository URL is required when cloning', path: ['repoUrl'] },
).refine(
  (data) => !data.openExisting || (data.existingPath && data.existingPath.trim().length > 0),
  { message: 'A directory path is required', path: ['existingPath'] },
);

export type CreateWorkspaceFormData = z.infer<typeof createWorkspaceSchema>;

export const renameWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').trim(),
});

export type RenameWorkspaceFormData = z.infer<typeof renameWorkspaceSchema>;
