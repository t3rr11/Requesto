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
  bodyType: z.enum(['json', 'form-data', 'x-www-form-urlencoded']),
  formDataEntries: z.array(
    z.object({
      id: z.string(),
      key: z.string(),
      value: z.string(),
      type: z.enum(['text', 'file']),
      fileName: z.string().optional(),
      fileContent: z.string().optional(),
      enabled: z.boolean(),
    })
  ),
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
      })
      .optional(),
  }),
  savedRequestId: z.string().optional(),
});

export type RequestFormData = z.infer<typeof requestFormSchema>;
