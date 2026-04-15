import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').trim(),
});

export const cloneWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').trim(),
  repoUrl: z.string().min(1, 'Repository URL is required'),
  authToken: z.string().optional(),
});

export const openWorkspaceSchema = z.object({
  path: z.string().min(1, 'Directory path is required'),
  name: z.string().optional(),
});

export const renameWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').trim(),
});

export type CreateWorkspaceDto = z.infer<typeof createWorkspaceSchema>;
export type CloneWorkspaceDto = z.infer<typeof cloneWorkspaceSchema>;
export type OpenWorkspaceDto = z.infer<typeof openWorkspaceSchema>;
export type RenameWorkspaceDto = z.infer<typeof renameWorkspaceSchema>;
