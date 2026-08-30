import { z } from 'zod';

export const ADD_WORKSPACE_MODES = ['create', 'open', 'clone', 'import'] as const;

export type AddWorkspaceMode = (typeof ADD_WORKSPACE_MODES)[number];

export const addWorkspaceSchema = z
  .object({
    mode: z.enum(ADD_WORKSPACE_MODES),
    name: z.string().trim().optional().default(''),
    path: z.string().trim().optional(),
    repoUrl: z.string().trim().optional(),
    authToken: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'create' && !data.name) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['name'], message: 'Workspace name is required' });
    }
    if (data.mode === 'open') {
      if (!data.name) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['name'], message: 'Workspace name is required' });
      }
      if (!data.path) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['path'], message: 'A folder path is required' });
      }
    }
    if (data.mode === 'clone') {
      if (!data.name) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['name'], message: 'Workspace name is required' });
      }
      if (!data.repoUrl) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['repoUrl'], message: 'Repository URL is required' });
      }
    }
  });

/** Form values as they come from the DOM (before zod defaults/transforms). */
export type AddWorkspaceFormInput = z.input<typeof addWorkspaceSchema>;

/** Parsed, sanitized form values. */
export type AddWorkspaceFormData = z.output<typeof addWorkspaceSchema>;

export const renameWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').trim(),
});

export type RenameWorkspaceFormData = z.infer<typeof renameWorkspaceSchema>;
