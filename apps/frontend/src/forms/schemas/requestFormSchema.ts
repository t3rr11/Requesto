import { z } from 'zod';

export const requestFormSchema = z.object({
  method: z.string(),
  url: z.string().min(1, 'URL is required'),
  headers: z.array(
    z.object({
      id: z.string(),
      key: z.string(),
      value: z.string(),
      enabled: z.boolean(),
    })
  ),
  params: z.array(
    z.object({
      id: z.string(),
      key: z.string(),
      value: z.string(),
      enabled: z.boolean(),
    })
  ),
  body: z.string(),
  auth: z.object({
    type: z.enum(['none', 'basic', 'bearer', 'api-key', 'digest', 'oauth']),
    basic: z
      .object({
        username: z.string(),
        password: z.string(),
      })
      .optional(),
    bearer: z
      .object({
        token: z.string(),
      })
      .optional(),
    apiKey: z
      .object({
        key: z.string(),
        value: z.string(),
        addTo: z.enum(['header', 'query']),
      })
      .optional(),
    digest: z
      .object({
        username: z.string(),
        password: z.string(),
      })
      .optional(),
    oauth: z
      .object({
        configId: z.string(),
        tokens: z
          .object({
            accessToken: z.string(),
            tokenType: z.string(),
            expiresIn: z.number().optional(),
            expiresAt: z.number().optional(),
            refreshToken: z.string().optional(),
            scope: z.string().optional(),
            idToken: z.string().optional(),
          })
          .optional(),
        isAuthenticated: z.boolean(),
        isRefreshing: z.boolean(),
        lastAuthenticatedAt: z.number().optional(),
        error: z.string().optional(),
      })
      .optional(),
  }),
  savedRequestId: z.string().optional(),
});

export type RequestFormData = z.infer<typeof requestFormSchema>;
