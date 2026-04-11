import type { OAuthConfig, OAuthFlowType } from '../../store/oauth/types';

export type OAuthProviderTemplate = {
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
};

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
  scopeDescription: 'Common scopes: User.Read, Mail.Read, Calendars.Read, Files.Read.',
  additionalParams: { response_mode: 'query' },
  documentation: 'https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow',
  notes: "Replace {tenant} with your tenant ID, 'common', 'organizations', or 'consumers'.",
};

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
  scopeDescription: 'Common scopes: https://www.googleapis.com/auth/userinfo.profile, drive.readonly.',
  additionalParams: { access_type: 'offline', prompt: 'consent' },
  documentation: 'https://developers.google.com/identity/protocols/oauth2/web-server',
};

export const GITHUB_TEMPLATE: OAuthProviderTemplate = {
  provider: 'github',
  name: 'github-oauth',
  displayName: 'GitHub OAuth',
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  flowType: 'authorization-code',
  usePKCE: false,
  defaultScopes: ['read:user', 'user:email'],
  scopeDescription: 'Common scopes: repo, user, read:user, user:email, admin:org.',
  documentation: 'https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps',
  notes: 'GitHub does NOT support PKCE. Tokens do not expire by default.',
};

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
  scopeDescription: 'Standard OIDC scopes. Custom scopes depend on your API.',
  additionalParams: { audience: '' },
  documentation: 'https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow',
  notes: "Replace {domain} with your Auth0 domain (e.g. your-tenant.auth0.com).",
};

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
  scopeDescription: 'Standard OIDC scopes. Include offline_access for refresh tokens.',
  documentation: 'https://developer.okta.com/docs/guides/implement-grant-type/authcode/main/',
  notes: "Replace {domain} with your Okta domain (e.g. your-org.okta.com).",
};

export function getAllProviderTemplates(): OAuthProviderTemplate[] {
  return [MICROSOFT_ENTRAID_TEMPLATE, GOOGLE_TEMPLATE, GITHUB_TEMPLATE, AUTH0_TEMPLATE, OKTA_TEMPLATE];
}

export function getProviderTemplate(name: string): OAuthProviderTemplate | null {
  return getAllProviderTemplates().find((t) => t.provider === name || t.name === name) || null;
}

export function createConfigFromTemplate(template: OAuthProviderTemplate, overrides: Partial<OAuthConfig> = {}): Partial<OAuthConfig> {
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
    tokenRefreshThreshold: 300,
    ...overrides,
  };
}

export function substituteUrlPlaceholders(url: string, substitutions: Record<string, string>): string {
  let result = url;
  for (const [key, value] of Object.entries(substitutions)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

export function extractUrlPlaceholders(url: string): string[] {
  const matches = url.match(/\{([^}]+)\}/g);
  return matches ? matches.map((m) => m.slice(1, -1)) : [];
}
