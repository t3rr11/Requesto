import { z } from 'zod';

/**
 * Mirrors the backend path rules: starts with `/`, no query string, and
 * `:name` segments declare request params.
 */
export const newMockEndpointSchema = z.object({
  name: z.string().min(1, 'Endpoint name is required').trim(),
  mode: z.enum(['static', 'dynamic']),
  path: z
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
          context.addIssue({ code: 'custom', path: [], message: 'Path parameter must have a name, e.g. ":id"' });
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
    }),
});

export type NewMockEndpointFormData = z.infer<typeof newMockEndpointSchema>;
