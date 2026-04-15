import { z } from 'zod';

export const commitSchema = z.object({
  message: z.string().min(1, 'Commit message is required').trim(),
});

export const addRemoteSchema = z.object({
  name: z.string().min(1, 'Remote name is required'),
  url: z.string().min(1, 'Remote URL is required'),
});

export const resolveConflictSchema = z.object({
  strategy: z.enum(['ours', 'theirs']),
  /** Optional list of specific file paths to resolve. Resolves all if omitted. */
  files: z.array(z.string()).optional(),
});

export type CommitDto = z.infer<typeof commitSchema>;
export type AddRemoteDto = z.infer<typeof addRemoteSchema>;
export type ResolveConflictDto = z.infer<typeof resolveConflictSchema>;
