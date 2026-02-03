/**
 * OAuth Provider Templates
 * Pre-configured OAuth settings for common providers
 */

import { OAuthConfig, OAuthFlowType } from '../../types';

export interface OAuthProviderTemplate {
  provider: string;
  name: string;
  displayName: string;
  authorizationUrl: string;
  tokenUrl: string;
  revocationUrl?: string;
  flowType: OAuthFlowType;
  usePKCE: boolean;
  defaultScopes: string[];
  scopeDescription: string;
  additionalParams?: Record<string, string>;
  documentation: string;
  notes?: string;
}

/**
 * Microsoft EntraID (Azure AD) OAuth 2.0 Template
 * Supports both personal Microsoft accounts and organizational accounts
 */
export const MICROSOFT_ENTRAID_TEMPLATE: OAuthProviderTemplate = {
  provider: 'microsoft',
  name: 'microsoft-entraid',
  displayName: 'Microsoft EntraID / Azure AD',
  authorizationUrl: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize',
  tokenUrl: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token',
  revocationUrl: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/logout',
  flowType: 'authorization-code-pkce',
  usePKCE: true,
  defaultScopes: ['openid', 'profile', 'email', 'offline_access'],
  scopeDescription: 'Common scopes: User.Read, Mail.Read, Calendars.Read, Files.Read. Use space-separated values.',
  additionalParams: {
    response_mode: 'query',
  },
  documentation: 'https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow',
  notes: `
    - Replace {tenant} with your tenant ID, 'common', 'organizations', or 'consumers'
    - 'common' allows both personal and work accounts
    - 'organizations' allows only work/school accounts
    - 'consumers' allows only personal Microsoft accounts
    - Requires https:// redirect URIs except for http://localhost
    - Include 'offline_access' scope to receive refresh tokens
  `,
};

/**
 * Google OAuth 2.0 Template
 * Supports Google Sign-In and Google API access
 */
export const GOOGLE_TEMPLATE: OAuthProviderTemplate = {
  provider: 'google',
  name: 'google-oauth',
  displayName: 'Google OAuth 2.0',
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  revocationUrl: 'https://oauth2.googleapis.com/revoke',
  flowType: 'authorization-code-pkce',
  usePKCE: true,
  defaultScopes: ['openid', 'profile', 'email'],
  scopeDescription: 'Common scopes: https://www.googleapis.com/auth/userinfo.profile, https://www.googleapis.com/auth/drive.readonly. Use space-separated values.',
  additionalParams: {
    access_type: 'offline', // Request refresh token
    prompt: 'consent', // Force consent screen to get refresh token
  },
  documentation: 'https://developers.google.com/identity/protocols/oauth2/web-server',
  notes: `
    - Use full scope URLs (e.g., https://www.googleapis.com/auth/drive.readonly)
    - Set access_type=offline to receive refresh tokens
    - Refresh tokens only issued on first authorization (use prompt=consent to re-request)
    - Supports both http://localhost and https:// redirect URIs
  `,
};

/**
 * GitHub OAuth Template
 * Note: GitHub does not support PKCE, uses standard authorization code flow
 */
export const GITHUB_TEMPLATE: OAuthProviderTemplate = {
  provider: 'github',
  name: 'github-oauth',
  displayName: 'GitHub OAuth',
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  revocationUrl: undefined, // GitHub handles revocation via API
  flowType: 'authorization-code', // GitHub doesn't support PKCE
  usePKCE: false,
  defaultScopes: ['read:user', 'user:email'],
  scopeDescription: 'Common scopes: repo, user, read:user, user:email, admin:org. Use space-separated values.',
  additionalParams: {},
  documentation: 'https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps',
  notes: `
    - GitHub does NOT support PKCE (use standard authorization code flow)
    - Token requests must include User-Agent header
    - Tokens do not expire by default (no refresh tokens)
    - Supports both http://localhost and https:// redirect URIs
    - Scopes are space-separated
  `,
};

/**
 * Auth0 OAuth Template
 * Universal authentication platform
 */
export const AUTH0_TEMPLATE: OAuthProviderTemplate = {
  provider: 'auth0',
  name: 'auth0-oauth',
  displayName: 'Auth0',
  authorizationUrl: 'https://{domain}/authorize',
  tokenUrl: 'https://{domain}/oauth/token',
  revocationUrl: 'https://{domain}/oauth/revoke',
  flowType: 'authorization-code-pkce',
  usePKCE: true,
  defaultScopes: ['openid', 'profile', 'email'],
  scopeDescription: 'Standard OIDC scopes: openid, profile, email. Custom scopes depend on your API.',
  additionalParams: {
    audience: '', // Required for API access
  },
  documentation: 'https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow',
  notes: `
    - Replace {domain} with your Auth0 domain (e.g., your-tenant.auth0.com or your-tenant.us.auth0.com)
    - Include 'audience' parameter to get access tokens for your API
    - Include 'offline_access' scope to receive refresh tokens
  `,
};

/**
 * Okta OAuth Template
 * Enterprise identity and access management
 */
export const OKTA_TEMPLATE: OAuthProviderTemplate = {
  provider: 'okta',
  name: 'okta-oauth',
  displayName: 'Okta',
  authorizationUrl: 'https://{domain}/oauth2/default/v1/authorize',
  tokenUrl: 'https://{domain}/oauth2/default/v1/token',
  revocationUrl: 'https://{domain}/oauth2/default/v1/revoke',
  flowType: 'authorization-code-pkce',
  usePKCE: true,
  defaultScopes: ['openid', 'profile', 'email'],
  scopeDescription: 'Standard OIDC scopes: openid, profile, email, offline_access. Custom scopes depend on your API.',
  documentation: 'https://developer.okta.com/docs/guides/implement-grant-type/authcode/main/',
  notes: `
    - Replace {domain} with your Okta domain (e.g., your-org.okta.com)
    - Replace 'default' with your authorization server ID if using custom auth server
    - Include 'offline_access' scope to receive refresh tokens
  `,
};

/**
 * Get all available provider templates
 * @returns Array of provider templates
 */
export function getAllProviderTemplates(): OAuthProviderTemplate[] {
  return [
    MICROSOFT_ENTRAID_TEMPLATE,
    GOOGLE_TEMPLATE,
    GITHUB_TEMPLATE,
    AUTH0_TEMPLATE,
    OKTA_TEMPLATE,
  ];
}

/**
 * Get a provider template by name
 * @param providerName - The provider name
 * @returns The provider template, or null if not found
 */
export function getProviderTemplate(providerName: string): OAuthProviderTemplate | null {
  const templates = getAllProviderTemplates();
  return templates.find(t => t.provider === providerName || t.name === providerName) || null;
}

/**
 * Create an OAuth config from a provider template
 * @param template - The provider template
 * @param overrides - Custom values to override template defaults
 * @returns Partial OAuth config (still needs clientId, name, etc.)
 */
export function createConfigFromTemplate(
  template: OAuthProviderTemplate,
  overrides: Partial<OAuthConfig> = {}
): Partial<OAuthConfig> {
  return {
    provider: template.provider,
    authorizationUrl: template.authorizationUrl,
    tokenUrl: template.tokenUrl,
    revocationUrl: template.revocationUrl,
    flowType: template.flowType,
    usePKCE: template.usePKCE,
    scopes: template.defaultScopes,
    additionalParams: template.additionalParams,
    tokenStorage: 'session',
    usePopup: true,
    autoRefreshToken: true,
    tokenRefreshThreshold: 300, // 5 minutes
    ...overrides,
  };
}

/**
 * Validate and substitute placeholders in OAuth URLs
 * @param url - The URL with potential placeholders
 * @param substitutions - Object with placeholder values
 * @returns URL with substituted values
 */
export function substituteUrlPlaceholders(
  url: string,
  substitutions: Record<string, string>
): string {
  let result = url;
  
  for (const [key, value] of Object.entries(substitutions)) {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value);
  }
  
  return result;
}

/**
 * Extract placeholder names from a URL
 * @param url - The URL with potential placeholders
 * @returns Array of placeholder names
 */
export function extractUrlPlaceholders(url: string): string[] {
  const matches = url.match(/\{([^}]+)\}/g);
  if (!matches) return [];
  
  return matches.map(m => m.slice(1, -1)); // Remove { and }
}
