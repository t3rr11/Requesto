import { z } from 'zod';
import { authConfigSchema, formDataEntrySchema } from './common';

export const createCollectionSchema = z.object({
  name: z.string().min(1, 'Collection name is required').trim(),
  description: z.string().optional(),
});

export const updateCollectionSchema = z.object({
  name: z.string().min(1).trim().optional(),
  description: z.string().optional(),
  openApiSpec: z
    .object({
      source: z.string(),
      lastSyncedAt: z.number(),
      specHash: z.string().optional(),
    })
    .nullable()
    .optional(),
});

export const addRequestSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Request name is required').trim(),
  method: z.string().min(1, 'HTTP method is required'),
  url: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
  bodyType: z.enum(['json', 'form-data', 'x-www-form-urlencoded']).optional(),
  formDataEntries: z.array(formDataEntrySchema).optional(),
  auth: authConfigSchema.optional(),
  collectionId: z.string(),
  folderId: z.string().optional(),
  order: z.number().optional(),
  operationId: z.string().optional(),
});

export const updateRequestSchema = addRequestSchema
  .omit({ id: true })
  .partial();

export const moveRequestSchema = z.object({
  targetCollectionId: z.string(),
  targetFolderId: z.string().nullable().optional(),
  order: z.number().optional(),
});

export const addFolderSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Folder name is required').trim(),
  parentId: z.string().optional(),
  collectionId: z.string(),
});

export const updateFolderSchema = addFolderSchema
  .omit({ id: true, collectionId: true })
  .partial();

export const moveFolderSchema = z.object({
  targetCollectionId: z.string(),
  targetParentFolderId: z.string().nullable().optional(),
});

export const importOpenApiSchema = z.object({
  source: z.string().min(1, 'Spec source is required').trim(),
  name: z.string().optional(),
  linkSpec: z.boolean().optional(),
});

export const applySyncSchema = z.object({
  changes: z.array(
    z.object({
      operationId: z.string(),
      action: z.enum(['add', 'update', 'remove', 'keep']),
    }),
  ),
  newSpecHash: z.string(),
  newSpecSource: z.string(),
});

export type CreateCollectionDto = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionDto = z.infer<typeof updateCollectionSchema>;
export type AddRequestDto = z.infer<typeof addRequestSchema>;
export type UpdateRequestDto = z.infer<typeof updateRequestSchema>;
export type MoveRequestDto = z.infer<typeof moveRequestSchema>;
export type AddFolderDto = z.infer<typeof addFolderSchema>;
export type UpdateFolderDto = z.infer<typeof updateFolderSchema>;
export type MoveFolderDto = z.infer<typeof moveFolderSchema>;
export type ImportOpenApiDto = z.infer<typeof importOpenApiSchema>;
export type ApplySyncDto = z.infer<typeof applySyncSchema>;
