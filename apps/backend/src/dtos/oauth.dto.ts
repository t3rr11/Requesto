import { z } from 'zod';

export const createOAuthConfigSchema = z.object({
  name: z.string().min(1, 'Configuration name is required').trim(),
  provider: z.string().min(1, 'Provider is required'),
  authorizationUrl: z.string().min(1, 'Authorization URL is required'),
  tokenUrl: z.string().min(1, 'Token URL is required'),
  revocationUrl: z.string().optional(),
  clientId: z.string().min(1, 'Client ID is required').trim(),
  clientSecret: z.string().optional(),
  flowType: z.string().min(1, 'Flow type is required'),
  usePKCE: z.boolean(),
  scopes: z.array(z.string()),
  additionalParams: z.record(z.string(), z.string()).optional(),
});

export const updateOAuthConfigSchema = createOAuthConfigSchema.partial();

export const tokenExchangeSchema = z.object({
  configId: z.string().min(1, 'Config ID is required'),
  code: z.string().min(1, 'Authorization code is required'),
  codeVerifier: z.string().optional(),
  redirectUri: z.string().min(1, 'Redirect URI is required'),
});

export const tokenRefreshSchema = z.object({
  configId: z.string().min(1, 'Config ID is required'),
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const tokenRevokeSchema = z.object({
  configId: z.string().min(1, 'Config ID is required'),
  token: z.string().min(1, 'Token is required'),
  tokenTypeHint: z.string().optional(),
});

export type CreateOAuthConfigDto = z.infer<typeof createOAuthConfigSchema>;
export type UpdateOAuthConfigDto = z.infer<typeof updateOAuthConfigSchema>;
export type TokenExchangeDto = z.infer<typeof tokenExchangeSchema>;
export type TokenRefreshDto = z.infer<typeof tokenRefreshSchema>;
export type TokenRevokeDto = z.infer<typeof tokenRevokeSchema>;
