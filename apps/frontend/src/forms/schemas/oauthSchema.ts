import { z } from 'zod';

// Form-level schema used by react-hook-form during editing.
// URLs use min(1) instead of url() because provider templates contain {placeholders}
// that get substituted before final submission.
export const oauthConfigFormSchema = z.object({
  name: z.string().min(1, 'Configuration name is required').trim(),
  provider: z.string().min(1, 'Please select a provider'),
  authorizationUrl: z.string().min(1, 'Authorization URL is required'),
  tokenUrl: z.string().min(1, 'Token URL is required'),
  revocationUrl: z.string().optional().or(z.literal('')),
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

export type OAuthConfigFormData = z.infer<typeof oauthConfigFormSchema>;

// Submission schema - validates URLs after placeholder substitution
export const oauthConfigSchema = oauthConfigFormSchema.extend({
  authorizationUrl: z.string().url('Invalid authorization URL'),
  tokenUrl: z.string().url('Invalid token URL'),
  revocationUrl: z.string().url('Invalid revocation URL').optional().or(z.literal('')),
});

// Wizard step field groups for per-step validation via trigger()
// Create mode: Provider → Credentials → Configure → Review
export const CREATE_STEP_FIELDS: Record<number, (keyof OAuthConfigFormData)[]> = {
  0: ['provider'],
  1: ['name', 'clientId'],
  2: ['authorizationUrl', 'tokenUrl', 'flowType'],
  3: [],
};

// Edit mode: Credentials → Configure → Review (provider step skipped)
export const EDIT_STEP_FIELDS: Record<number, (keyof OAuthConfigFormData)[]> = {
  0: ['name', 'clientId'],
  1: ['authorizationUrl', 'tokenUrl', 'flowType'],
  2: [],
};
