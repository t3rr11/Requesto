import { z } from 'zod';

export const oauthConfigSchema = z.object({
  name: z.string().min(1, 'Configuration name is required').trim(),
  provider: z.string(),
  authorizationUrl: z.string().url('Invalid authorization URL'),
  tokenUrl: z.string().url('Invalid token URL'),
  revocationUrl: z.string().url('Invalid revocation URL').optional().or(z.literal('')),
  clientId: z.string().min(1, 'Client ID is required').trim(),
  clientSecret: z.string().optional(),
  flowType: z.enum(['authorization-code', 'authorization-code-pkce', 'implicit', 'client-credentials', 'password']),
  usePKCE: z.boolean(),
  scopes: z.string(),
  redirectUri: z.string().optional(),
  tokenStorage: z.enum(['memory', 'session', 'local']),
  usePopup: z.boolean(),
  autoRefreshToken: z.boolean(),
  tokenRefreshThreshold: z.number().min(60).max(3600),
});

export type OAuthConfigFormData = z.infer<typeof oauthConfigSchema>;
