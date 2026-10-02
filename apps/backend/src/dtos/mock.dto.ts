import { z } from 'zod';

/**
 * Endpoint paths are matched as URL pathname segments: they must start with `/`,
 * may not contain a query string, and `:name` segments become request params.
 */
export const mockEndpointPathSchema = z
  .string()
  .min(1, 'Path is required')
  .regex(/^\/[^?#]*$/, 'Path must start with "/" and must not contain a query string')
  .superRefine((value, context) => {
    // "/" (the root) is a valid mock path for index-style responses
    const segments = value.split('/').filter((segment) => segment.length > 0);
    if (segments.length === 0) {
      if (value !== '/') {
        context.addIssue({ code: 'custom', path: [], message: 'Path is required' });
      }
      return;
    }
    for (const segment of segments) {
      if (segment.startsWith(':') && segment.length === 1) {
        context.addIssue({
          code: 'custom',
          path: [],
          message: 'Path parameter must have a name, e.g. ":id"',
        });
        return;
      }
      if (!segment.startsWith(':') && /[%\s]/.test(segment)) {
        context.addIssue({
          code: 'custom',
          path: [],
          message: 'Path segments must not contain spaces or percent signs',
        });
        return;
      }
    }
  });

export const mockStaticResponseSchema = z.object({
  status: z.number().int().min(100).max(599).default(200),
  headers: z.record(z.string(), z.string()).default({}),
  contentType: z.enum(['json', 'xml', 'html', 'text']).default('json'),
  body: z.string().default(''),
  delayMs: z.number().int().min(0).max(60000).default(0),
});

export const mockMethodsSchema = z.object({
  GET: mockStaticResponseSchema.optional(),
  POST: mockStaticResponseSchema.optional(),
  PUT: mockStaticResponseSchema.optional(),
  PATCH: mockStaticResponseSchema.optional(),
  DELETE: mockStaticResponseSchema.optional(),
});

/** Guard against runaway dataset writes; a mock dataset is a dev aid, not a database. */
export const MAX_DATASET_RECORDS = 1000;

export const mockDatasetSchema = z
  .array(z.record(z.string(), z.unknown()))
  .max(MAX_DATASET_RECORDS, `Dataset cannot exceed ${MAX_DATASET_RECORDS} records`);

export const createMockEndpointSchema = z
  .object({
    name: z.string().min(1, 'Endpoint name is required').trim(),
    path: mockEndpointPathSchema,
    enabled: z.boolean().default(true),
    mode: z.enum(['static', 'dynamic']).default('static'),
    methods: mockMethodsSchema.default({}),
  })
  .refine(
    (data) => data.mode === 'dynamic' || Object.values(data.methods).some(Boolean),
    'At least one method must be configured in static mode',
  );

export const updateMockEndpointSchema = z
  .object({
    name: z.string().min(1, 'Endpoint name is required').trim().optional(),
    path: mockEndpointPathSchema.optional(),
    enabled: z.boolean().optional(),
    mode: z.enum(['static', 'dynamic']).optional(),
    methods: mockMethodsSchema.optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined || value.path !== undefined || value.enabled !== undefined || value.mode !== undefined || value.methods !== undefined,
    'At least one field must be provided',
  );

export const reorderMockEndpointsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const startMockServerSchema = z.object({
  port: z.number().int().min(1).max(65535).optional(),
});

export type CreateMockEndpointDto = z.infer<typeof createMockEndpointSchema>;
export type UpdateMockEndpointDto = z.infer<typeof updateMockEndpointSchema>;
