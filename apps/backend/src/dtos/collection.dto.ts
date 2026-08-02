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

const requestFieldsSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Request name is required').trim(),
  requestType: z.enum(['http', 'graphql']).optional(),
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
  preRequestScript: z.string().optional(),
  testScript: z.string().optional(),
  graphql: z
    .object({
      document: z.string(),
      variables: z.string(),
      operationName: z.string().optional(),
      transport: z.enum(['post', 'get']),
      schemaProfileId: z.string().optional(),
    })
    .optional(),
});

function validateRequestShape(
  value: Pick<
    Partial<z.infer<typeof requestFieldsSchema>>,
    'requestType' | 'graphql' | 'body' | 'formDataEntries'
  >,
  context: z.RefinementCtx,
): void {
  if (value.requestType === 'graphql') {
    if (!value.graphql) {
      context.addIssue({ code: 'custom', path: ['graphql'], message: 'GraphQL request configuration is required' });
    }
    if (value.body !== undefined || value.formDataEntries !== undefined) {
      context.addIssue({ code: 'custom', path: ['body'], message: 'HTTP body fields are not valid for GraphQL requests' });
    }
  } else if (value.requestType === 'http' && value.graphql !== undefined) {
    context.addIssue({ code: 'custom', path: ['graphql'], message: 'GraphQL configuration is not valid for HTTP requests' });
  }
}

export const addRequestSchema = requestFieldsSchema.superRefine(validateRequestShape);

export const createRequestPayloadSchema = requestFieldsSchema
  .omit({ id: true, collectionId: true })
  .superRefine(validateRequestShape);

export const updateRequestSchema = requestFieldsSchema
  .omit({ id: true })
  .partial()
  .superRefine(validateRequestShape);

export const updateRequestPayloadSchema = requestFieldsSchema
  .omit({ id: true, collectionId: true })
  .partial()
  .superRefine(validateRequestShape);

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
