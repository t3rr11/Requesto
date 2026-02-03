# OAuth Implementation Plan for Localman

**Created:** February 3, 2026  
**Status:** Planning Phase

## Table of Contents
1. [Overview](#overview)
2. [Requirements Analysis](#requirements-analysis)
3. [OAuth Flow Types](#oauth-flow-types)
4. [Architecture Design](#architecture-design)
5. [Security Considerations](#security-considerations)
6. [Redirect URI Handling](#redirect-uri-handling)
7. [Data Model](#data-model)
8. [Implementation Phases](#implementation-phases)
9. [Testing Strategy](#testing-strategy)

---

## Overview

This document outlines a comprehensive plan to implement OAuth 2.0 authentication in Localman, an API testing tool. The implementation prioritizes security by handling OAuth flows entirely client-side while only storing non-sensitive configuration data on the server.

### Key Principles
- **Client-side flow execution**: All OAuth flows execute in the browser
- **Minimal server storage**: Only store client_id, client_secret, and OAuth metadata
- **No token storage on server**: Access tokens, refresh tokens remain client-side only
- **Multi-environment support**: Handle both local dev (localhost:5173) and production deployments (reverse proxy on 80/443)
- **Provider-specific handling**: Support provider-specific requirements (e.g., EntraID localhost restrictions)

---

## Requirements Analysis

### Functional Requirements

#### FR1: OAuth Flow Support
- **FR1.1**: Support Authorization Code Flow (with PKCE)
- **FR1.2**: Support Implicit Flow (legacy, less secure)
- **FR1.3**: Support Client Credentials Flow (machine-to-machine)
- **FR1.4**: Support Resource Owner Password Credentials Flow (if needed)
- **FR1.5**: Support Device Authorization Flow (for devices without browsers)

#### FR2: Token Management
- **FR2.1**: Acquire access tokens via OAuth flows
- **FR2.2**: Store access tokens client-side only (memory or localStorage/sessionStorage)
- **FR2.3**: Refresh token support with automatic refresh before expiry
- **FR2.4**: Token revocation support
- **FR2.5**: Multiple token profiles per request/collection

#### FR3: Provider Configuration
- **FR3.1**: Store OAuth provider configuration (authorization URL, token URL, scopes)
- **FR3.2**: Support custom OAuth providers
- **FR3.3**: Pre-configured templates for common providers (Google, Microsoft, GitHub, Okta, Auth0)
- **FR3.4**: Provider-specific parameter support (e.g., resource, audience)

#### FR4: Redirect Handling
- **FR4.1**: Support redirect-based flows in both popup and full redirect modes
- **FR4.2**: Dynamic redirect URI based on deployment context
- **FR4.3**: Handle http://localhost callback URLs for local development
- **FR4.4**: Handle https:// callback URLs for production deployments
- **FR4.5**: Callback URL registration helper/documentation

#### FR5: User Experience
- **FR5.1**: Visual OAuth configuration editor in AuthEditor component
- **FR5.2**: "Authenticate" button to trigger OAuth flow
- **FR5.3**: Token status display (authenticated, expires in X minutes)
- **FR5.4**: Token refresh indicator
- **FR5.5**: Clear authentication/logout functionality

#### FR6: Variable Integration
- **FR6.1**: Store tokens as environment variables
- **FR6.2**: Reference tokens via {{access_token}} syntax
- **FR6.3**: Automatic token injection into Authorization header

### Non-Functional Requirements

#### NFR1: Security
- **NFR1.1**: Use PKCE for Authorization Code Flow
- **NFR1.2**: State parameter validation to prevent CSRF
- **NFR1.3**: Nonce parameter for OpenID Connect
- **NFR1.4**: No sensitive data logged
- **NFR1.5**: Client secrets only stored server-side (never in browser)
- **NFR1.6**: Access tokens never sent to Localman backend

#### NFR2: Performance
- **NFR2.1**: OAuth flow completion within 30 seconds
- **NFR2.2**: Automatic token refresh without user interaction
- **NFR2.3**: Minimal UI blocking during authentication

#### NFR3: Compatibility
- **NFR3.1**: Support OAuth 2.0 RFC 6749
- **NFR3.2**: Support PKCE RFC 7636
- **NFR3.3**: Support OpenID Connect Discovery
- **NFR3.4**: Browser support: Chrome, Firefox, Safari, Edge (last 2 versions)

#### NFR4: Maintainability
- **NFR4.1**: Clear separation between OAuth flow types
- **NFR4.2**: Provider configuration as JSON/YAML
- **NFR4.3**: Comprehensive error messages
- **NFR4.4**: Detailed logging (with PII redaction)

---

## OAuth Flow Types

### 1. Authorization Code Flow with PKCE (Primary, Most Secure)

**Use Case**: SPAs and public clients (our primary use case)

**Flow Steps**:
1. User initiates OAuth in Localman
2. Generate `code_verifier` (random string) and `code_challenge` (SHA256 hash)
3. Redirect/popup to authorization endpoint with:
   - `response_type=code`
   - `client_id`
   - `redirect_uri`
   - `scope`
   - `state` (CSRF protection)
   - `code_challenge`
   - `code_challenge_method=S256`
4. User authenticates and authorizes
5. Provider redirects back with `code` and `state`
6. Validate `state` matches
7. Exchange code for token at token endpoint with:
   - `grant_type=authorization_code`
   - `code`
   - `redirect_uri`
   - `client_id`
   - `code_verifier`
   - `client_secret` (if confidential client)
8. Store access token, refresh token (if provided) client-side

**Client-Side Data**:
- code_verifier (temporary, generated per flow)
- state (temporary, generated per flow)
- access_token (stored after exchange)
- refresh_token (stored after exchange)
- expires_in/expires_at

**Server-Side Data**:
- client_id
- client_secret (if confidential)
- authorization_url
- token_url
- scopes
- redirect_uri_template

**Pros**: Most secure for public clients, prevents authorization code interception
**Cons**: Requires backend endpoint for token exchange if client_secret needed

---

### 2. Implicit Flow (Legacy, Deprecated)

**Use Case**: Legacy SPAs, avoid if possible

**Flow Steps**:
1. User initiates OAuth
2. Redirect/popup to authorization endpoint with:
   - `response_type=token` (or `id_token` for OIDC)
   - `client_id`
   - `redirect_uri`
   - `scope`
   - `state`
   - `nonce` (for OIDC)
3. User authenticates
4. Provider redirects back with token in URL fragment
5. Extract token from fragment
6. Store access token client-side

**Security Note**: Access token exposed in browser history and referrer headers. Use only when absolutely required.

**Pros**: Simple, no token exchange needed
**Cons**: Less secure, no refresh tokens, token in URL

---

### 3. Client Credentials Flow

**Use Case**: Machine-to-machine, service accounts

**Flow Steps**:
1. Direct POST to token endpoint with:
   - `grant_type=client_credentials`
   - `client_id`
   - `client_secret`
   - `scope`
2. Receive access token
3. Store token client-side

**Server-Side Data**:
- client_id
- client_secret
- token_url
- scopes

**Pros**: Simple, no user interaction
**Cons**: Requires client_secret, user-independent

---

### 4. Resource Owner Password Credentials Flow

**Use Case**: Trusted applications only, avoid if possible

**Flow Steps**:
1. Collect username and password from user
2. POST to token endpoint with:
   - `grant_type=password`
   - `username`
   - `password`
   - `client_id`
   - `client_secret`
   - `scope`
3. Receive access token
4. Store token client-side

**Security Note**: Only use when absolutely necessary, requires handling user credentials

**Pros**: Simple, works without browser redirect
**Cons**: Exposes credentials to application, discouraged by OAuth 2.0 spec

---

### 5. Device Authorization Flow (Future)

**Use Case**: Devices without browsers or input-constrained devices

**Flow Steps**:
1. POST to device authorization endpoint
2. Display code to user
3. User visits verification URL on another device
4. Poll token endpoint until authorization complete
5. Receive access token

**Use Case for Localman**: Could be useful for CI/CD scenarios or headless testing

---

## Architecture Design

### Component Structure

```
Frontend (React)
├── components/
│   ├── AuthEditor.tsx (updated)
│   │   └── OAuthEditor.tsx (new)
│   ├── OAuthCallback.tsx (new)
│   └── TokenStatus.tsx (new)
├── helpers/
│   ├── oauth/
│   │   ├── oauthFlowHandler.ts (new)
│   │   ├── pkceHelper.ts (new)
│   │   ├── tokenManager.ts (new)
│   │   ├── redirectHandler.ts (new)
│   │   └── providers.ts (new - provider templates)
│   └── api/
│       └── oauthApi.ts (new)
├── hooks/
│   ├── useOAuthFlow.ts (new)
│   └── useTokenRefresh.ts (new)
└── store/
    └── useOAuthStore.ts (new)

Backend (Fastify)
├── routes/
│   ├── oauth.ts (new)
│   └── proxy.ts (updated)
├── helpers/
│   ├── authHelpers.ts (updated)
│   └── oauthHelpers.ts (new)
└── types/
    └── index.ts (updated)
```

### Data Flow

#### Authorization Code Flow with PKCE

```
┌─────────────┐                                    ┌──────────────┐
│   Browser   │                                    │   Localman   │
│  (Frontend) │                                    │   Backend    │
└──────┬──────┘                                    └───────┬──────┘
       │                                                   │
       │ 1. User clicks "Authenticate"                    │
       │────────────────────────────────►                 │
       │                                                   │
       │ 2. GET /api/oauth/config/:configId               │
       │──────────────────────────────────────────────────►
       │                                                   │
       │ 3. Return OAuth config (no secrets)              │
       │◄──────────────────────────────────────────────────
       │                                                   │
       │ 4. Generate code_verifier, code_challenge        │
       │    Generate state parameter                      │
       │                                                   │
       │ 5. Open popup/redirect to Authorization URL      │
       │────────────► ┌──────────────┐                    │
       │              │   OAuth      │                    │
       │              │   Provider   │                    │
       │              └──────┬───────┘                    │
       │                     │                            │
       │ 6. User authenticates and approves               │
       │                     │                            │
       │ 7. Redirect to callback with code & state        │
       │◄────────────────────┘                            │
       │                                                   │
       │ 8. Validate state                                │
       │                                                   │
       │ 9. POST /api/oauth/token                         │
       │    { configId, code, codeVerifier }              │
       │──────────────────────────────────────────────────►
       │                                                   │
       │                                    10. Exchange   │
       │                                    code for token│
       │                                    (w/ secret)   │
       │                                    ──────────────►
       │                                    Provider      │
       │                                    ◄──────────────
       │                                                   │
       │ 11. Return { access_token, refresh_token, ... }  │
       │◄──────────────────────────────────────────────────
       │                                                   │
       │ 12. Store tokens client-side (memory/storage)    │
       │                                                   │
       │ 13. Make API requests with token                 │
       │                                                   │
```

#### Token Usage in API Requests

```
┌─────────────┐                                    ┌──────────────┐
│   Browser   │                                    │   Localman   │
│  (Frontend) │                                    │   Backend    │
└──────┬──────┘                                    └───────┬──────┘
       │                                                   │
       │ 1. User sends request with OAuth auth            │
       │    Token available client-side                   │
       │                                                   │
       │ 2. Add Authorization: Bearer {token} to headers  │
       │                                                   │
       │ 3. POST /api/proxy/request                       │
       │    { method, url, headers (with token), body }   │
       │──────────────────────────────────────────────────►
       │                                                   │
       │                                    4. Proxy       │
       │                                    request to    │
       │                                    target API    │
       │                                    ──────────────►
       │                                    Target API    │
       │                                    ◄──────────────
       │                                                   │
       │ 5. Return response                               │
       │◄──────────────────────────────────────────────────
       │                                                   │
```

### Token Storage Options

#### Option A: In-Memory Storage (Most Secure)
- Store tokens in React state/Zustand store
- Tokens cleared on page refresh
- **Pros**: Most secure, no persistence attacks
- **Cons**: User must re-authenticate on refresh

#### Option B: sessionStorage (Balanced)
- Tokens persist during browser session
- Cleared when tab closed
- **Pros**: Survives page refresh, cleared on close
- **Cons**: XSS vulnerabilities

#### Option C: localStorage (Least Secure, Most Convenient)
- Tokens persist across sessions
- **Pros**: Survives browser restart
- **Cons**: XSS vulnerabilities, persists indefinitely

#### Recommendation: 
Implement all three with user preference selection. Default to **sessionStorage** as a balance between security and UX. Provide clear warnings about security implications.

---

## Security Considerations

### 1. PKCE (Proof Key for Code Exchange)
- **Required** for Authorization Code Flow
- Prevents authorization code interception attacks
- Generate cryptographically random `code_verifier` (43-128 characters)
- Compute `code_challenge = BASE64URL(SHA256(code_verifier))`

### 2. State Parameter
- Prevents CSRF attacks
- Generate random state value before authorization request
- Validate state matches on callback
- Store state in sessionStorage keyed by request ID

### 3. Nonce (for OpenID Connect)
- Prevents replay attacks
- Include in ID token validation

### 4. Client Secret Protection
- **Never** expose client_secret to browser
- Store client_secret only on backend
- Token exchange must happen server-side when client_secret required
- Backend endpoint `/api/oauth/token` handles exchange

### 5. Token Storage
- Avoid localStorage if possible (XSS risk)
- Clear tokens on logout
- Implement token expiry checks
- Automatic token refresh before expiry

### 6. Redirect URI Validation
- Whitelist allowed redirect URIs
- Validate redirect URI matches configured value
- Use exact matching (not substring)

### 7. Scope Management
- Request minimal necessary scopes
- Display requested scopes to user
- Allow scope customization per request

### 8. Content Security Policy
- Restrict OAuth provider domains
- Allow popups for OAuth flows

---

## Redirect URI Handling

This is critical for Localman's multi-environment support.

### Challenge
- **Local Development**: `http://localhost:5173`
- **Production**: `https://yourdomain.com` or `https://localhost` (behind reverse proxy)
- **EntraID Restriction**: Only allows `http://` for `localhost` domain, requires `https://` for all others

### Solution: Dynamic Redirect URI Detection

#### Strategy 1: Environment-Based Configuration
```typescript
const getRedirectUri = (): string => {
  const protocol = window.location.protocol; // 'http:' or 'https:'
  const hostname = window.location.hostname; // 'localhost' or 'yourdomain.com'
  const port = window.location.port; // '5173', '80', '443', or ''
  
  // Build base URL
  let baseUrl = `${protocol}//${hostname}`;
  
  // Only add port if non-standard
  if (port && port !== '80' && port !== '443') {
    baseUrl += `:${port}`;
  }
  
  return `${baseUrl}/oauth/callback`;
};
```

#### Strategy 2: Configurable Redirect URI
- Allow users to configure redirect URI in OAuth settings
- Provide detected value as default
- Validate configuration matches current origin for security

#### Strategy 3: Multiple Redirect URIs
- Register multiple redirect URIs with OAuth provider
- Select appropriate one based on current environment
- Fallback logic if primary fails

### EntraID-Specific Handling
```typescript
const getRedirectUriForEntraId = (): string => {
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  
  if (isLocalhost) {
    // EntraID allows http://localhost
    const port = window.location.port;
    const portPart = port ? `:${port}` : '';
    return `http://localhost${portPart}/oauth/callback`;
  } else {
    // EntraID requires https:// for non-localhost
    return `https://${hostname}/oauth/callback`;
  }
};
```

### Callback Route
- Create dedicated route: `/oauth/callback`
- Parse authorization code or token from URL
- Post message to opener (if popup) or handle in same window
- Redirect to original page after handling

#### Popup vs Full Redirect

**Popup Approach** (Recommended for Desktop)
```typescript
const openOAuthPopup = (authUrl: string): Promise<AuthResult> => {
  return new Promise((resolve, reject) => {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      authUrl,
      'oauth-popup',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    
    if (!popup) {
      reject(new Error('Popup blocked'));
      return;
    }
    
    // Listen for message from popup
    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === 'oauth-callback') {
        window.removeEventListener('message', messageHandler);
        popup.close();
        resolve(event.data.payload);
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    // Check if popup closed
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        reject(new Error('Popup closed by user'));
      }
    }, 500);
  });
};
```

**Full Redirect Approach** (Fallback/Mobile)
- Store current app state in sessionStorage before redirect
- Redirect to OAuth provider
- Handle callback on return
- Restore app state from sessionStorage
- Resume where user left off

### Recommendation
- Default to **popup** for desktop browsers
- Detect popup blockers and fall back to full redirect
- Use full redirect on mobile devices (popups unreliable)
- Provide user preference toggle

---

## Data Model

### Type Definitions

#### Frontend Types
```typescript
// Add to apps/frontend/src/types/index.ts

export type OAuthFlowType = 
  | 'authorization-code' 
  | 'authorization-code-pkce' 
  | 'implicit' 
  | 'client-credentials' 
  | 'password'
  | 'device-code';

export type OAuthTokenStorage = 'memory' | 'session' | 'local';

export interface OAuthConfig {
  // Provider info
  provider: string; // 'custom', 'google', 'microsoft', 'github', etc.
  providerName?: string; // Display name
  
  // OAuth endpoints
  authorizationUrl: string;
  tokenUrl: string;
  revocationUrl?: string;
  
  // Client credentials (stored on backend)
  clientId: string;
  clientSecret?: string; // Only for confidential clients
  
  // Flow configuration
  flowType: OAuthFlowType;
  usePKCE: boolean; // Auto-true for authorization-code-pkce
  
  // Redirect configuration
  redirectUri?: string; // Optional override, auto-detected if not set
  
  // Scopes and parameters
  scopes: string[];
  additionalParams?: Record<string, string>; // e.g., { audience: '...', resource: '...' }
  
  // Token storage preference
  tokenStorage: OAuthTokenStorage;
  
  // Advanced options
  usePopup: boolean; // vs full redirect
  autoRefreshToken: boolean;
  tokenRefreshThreshold: number; // seconds before expiry to refresh
}

export interface OAuthTokens {
  accessToken: string;
  tokenType: string; // 'Bearer'
  expiresIn?: number; // seconds
  expiresAt?: number; // timestamp
  refreshToken?: string;
  scope?: string;
  idToken?: string; // for OpenID Connect
}

export interface OAuthState {
  configId: string;
  state: string; // CSRF token
  codeVerifier?: string; // For PKCE
  nonce?: string; // For OIDC
  redirectUri: string;
  timestamp: number;
}

export interface OAuthAuth {
  configId: string;
  config: OAuthConfig;
  tokens?: OAuthTokens;
  isAuthenticated: boolean;
  isRefreshing: boolean;
  error?: string;
}

// Update AuthConfig
export interface AuthConfig {
  type: AuthType;
  basic?: BasicAuth;
  bearer?: BearerAuth;
  apiKey?: ApiKeyAuth;
  digest?: DigestAuth;
  oauth?: OAuthAuth; // NEW
}

// Update AuthType
export type AuthType = 
  | 'none' 
  | 'basic' 
  | 'bearer' 
  | 'api-key' 
  | 'digest'
  | 'oauth'; // NEW
```

#### Backend Types
```typescript
// Add to apps/backend/src/types/index.ts

export interface OAuthConfigServer {
  id: string;
  provider: string;
  providerName?: string;
  authorizationUrl: string;
  tokenUrl: string;
  revocationUrl?: string;
  clientId: string;
  clientSecret?: string; // Encrypted at rest
  flowType: string;
  redirectUriTemplate?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TokenExchangeRequest {
  configId: string;
  code: string;
  codeVerifier?: string; // For PKCE
  redirectUri: string;
}

export interface TokenExchangeResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}
```

### Storage Structure

#### Backend Storage (JSON files)
```json
// data/oauth-configs.json
{
  "configs": [
    {
      "id": "oauth-config-1",
      "provider": "microsoft",
      "providerName": "Microsoft EntraID",
      "authorizationUrl": "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize",
      "tokenUrl": "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
      "clientId": "your-client-id",
      "clientSecret": "encrypted-secret",
      "flowType": "authorization-code-pkce",
      "createdAt": 1643900000000,
      "updatedAt": 1643900000000
    }
  ]
}
```

#### Frontend Storage (sessionStorage example)
```json
// sessionStorage.getItem('oauth-tokens-{configId}')
{
  "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "expiresAt": 1643903600000,
  "refreshToken": "0.ARoA6WgJJ...",
  "scope": "user.read mail.read"
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal**: Set up basic OAuth infrastructure

- [ ] Update type definitions (frontend & backend)
- [ ] Create OAuth configuration storage (backend)
- [ ] Create OAuth store (frontend Zustand)
- [ ] Implement PKCE helper functions
- [ ] Implement state/nonce generation
- [ ] Create redirect URI detection logic
- [ ] Create callback route/component

### Phase 2: Authorization Code Flow with PKCE (Week 2)
**Goal**: Implement primary OAuth flow

- [ ] Implement authorization URL builder
- [ ] Create popup/redirect handler
- [ ] Implement token exchange endpoint (backend)
- [ ] Implement token storage manager
- [ ] Create OAuthEditor component UI
- [ ] Integrate with AuthEditor
- [ ] Test with test OAuth provider

### Phase 3: Token Management (Week 2-3)
**Goal**: Handle token lifecycle

- [ ] Implement token refresh logic
- [ ] Create useTokenRefresh hook
- [ ] Implement automatic token refresh
- [ ] Add token expiry indicators
- [ ] Implement token revocation
- [ ] Add logout/clear tokens functionality

### Phase 4: Provider Templates (Week 3)
**Goal**: Make common providers easy to configure

- [ ] Create provider template system
- [ ] Add templates:
  - [ ] Google OAuth 2.0
  - [ ] Microsoft EntraID / Azure AD
  - [ ] GitHub OAuth
  - [ ] Okta
  - [ ] Auth0
- [ ] Create provider selection UI
- [ ] Add provider-specific documentation

### Phase 5: Additional Flows (Week 4)
**Goal**: Support other OAuth flows

- [ ] Implement Client Credentials Flow
- [ ] Implement Implicit Flow (with warnings)
- [ ] Implement Password Credentials Flow (with warnings)
- [ ] Add flow-specific UI/UX

### Phase 6: Enhanced Features (Week 5)
**Goal**: Polish and advanced features

- [ ] Token storage preference (memory/session/local)
- [ ] Multiple OAuth configs per collection
- [ ] OAuth config import/export
- [ ] Token introspection UI
- [ ] Token debugging tools
- [ ] Comprehensive error handling

### Phase 7: Testing & Documentation (Week 6)
**Goal**: Ensure quality and usability

- [ ] Unit tests for OAuth helpers
- [ ] Integration tests for OAuth flows
- [ ] Test with real OAuth providers
- [ ] User documentation
- [ ] Video tutorial
- [ ] Migration guide from bearer tokens

---

## Testing Strategy

### Unit Tests
- PKCE code verifier/challenge generation
- State parameter generation and validation
- Token expiry calculation
- Redirect URI building
- Provider template loading

### Integration Tests
- Full Authorization Code Flow with test OAuth server
- Token exchange with mock backend
- Token refresh flow
- Popup communication
- Full redirect flow

### Manual Testing Matrix

| Provider | Flow Type | Environment | Redirect Type | Status |
|----------|-----------|-------------|---------------|--------|
| Google | Auth Code PKCE | localhost:5173 | Popup | ⏳ |
| Google | Auth Code PKCE | localhost:5173 | Redirect | ⏳ |
| Google | Auth Code PKCE | https://prod | Popup | ⏳ |
| Microsoft | Auth Code PKCE | localhost:5173 | Popup | ⏳ |
| Microsoft | Auth Code PKCE | https://prod | Popup | ⏳ |
| GitHub | Auth Code | localhost:5173 | Popup | ⏳ |
| Custom | Client Creds | N/A | N/A | ⏳ |

### Security Testing
- [ ] Verify PKCE challenge/verifier not reused
- [ ] Verify state parameter validation
- [ ] Verify client_secret never exposed to browser
- [ ] Test token storage security (XSS scenarios)
- [ ] Verify redirect URI validation
- [ ] Test with various CSP configurations

---

## Open Questions & Decisions Needed

### 1. Token Storage Default
**Question**: What should be the default token storage?
**Options**:
- A) Memory (most secure, lost on refresh)
- B) sessionStorage (balanced, lost on tab close)
- C) localStorage (persistent, less secure)

**Recommendation**: sessionStorage as default, with clear UI to change preference

---

### 2. Client Secret Handling
**Question**: How to handle flows requiring client_secret?
**Options**:
- A) Always require token exchange via backend (more secure)
- B) Allow optional client-side exchange for public clients
- C) Separate "confidential" vs "public" client configurations

**Recommendation**: Option A for confidential clients, Option B for public clients with clear warnings

---

### 3. Popup Blocker Handling
**Question**: What UX when popup is blocked?
**Options**:
- A) Automatically fall back to full redirect
- B) Show error message with "try again" and instructions
- C) Detect and warn before attempting popup

**Recommendation**: Option C (detect) + Option A (auto-fallback) with user notification

---

### 4. Multiple OAuth Configs
**Question**: Can one request have multiple OAuth configs?
**Scenario**: API requires OAuth to one service, then use that token to get token for another service

**Recommendation**: Phase 1 supports single config, Phase 2+ can add chained OAuth flows

---

### 5. Token Persistence Across Collections
**Question**: Should OAuth tokens be per-request, per-collection, or global?

**Recommendation**:
- OAuth **config** stored per-request (like current auth)
- OAuth **tokens** optionally shared across requests with same config
- UI toggle to "use existing session" vs "new authentication"

---

### 6. Token Security Warning
**Question**: Should we show security warnings about localStorage?

**Recommendation**: Yes, clear warnings when user selects localStorage, with recommendation to use sessionStorage

---

### 7. Provider Discovery (OIDC)
**Question**: Should we support OpenID Connect Discovery for automatic endpoint detection?

**Recommendation**: Yes, add in Phase 4. Allow entering `issuer` URL and auto-fetch `.well-known/openid-configuration`

---

### 8. Refresh Token Rotation
**Question**: Handle refresh token rotation (new refresh token on each refresh)?

**Recommendation**: Yes, update stored refresh token when new one provided in refresh response

---

## Risk Assessment

### High Risk
1. **Client Secret Exposure**: Mitigated by backend-only storage
2. **XSS Token Theft**: Mitigated by token storage options and CSP
3. **CSRF on Callback**: Mitigated by state parameter validation
4. **Redirect URI Hijacking**: Mitigated by whitelist validation

### Medium Risk
1. **Popup Blockers**: Mitigated by auto-fallback to redirect
2. **Token Expiry During Request**: Mitigated by auto-refresh
3. **Provider Configuration Errors**: Mitigated by templates and validation

### Low Risk
1. **Browser Compatibility**: Modern browser APIs widely supported
2. **Performance Impact**: OAuth flows only on-demand

---

## Success Criteria

### MVP Success (End of Phase 3)
- [ ] Authorization Code Flow with PKCE working end-to-end
- [ ] Token refresh working automatically
- [ ] Works in both localhost and production environments
- [ ] Secure (client_secret not exposed, tokens client-side only)
- [ ] At least one real provider (Microsoft EntraID) tested successfully

### Full Success (End of Phase 7)
- [ ] All major OAuth flows implemented
- [ ] 5+ provider templates available
- [ ] Comprehensive documentation
- [ ] All security tests passed
- [ ] Positive user feedback on UX

---

## Next Steps

1. **Review this document** with team/stakeholders
2. **Validate architecture** with security review
3. **Set up test OAuth applications** with Google, Microsoft, GitHub
4. **Create detailed task breakdown** for Phase 1
5. **Begin implementation** with Phase 1 Foundation

---

## Appendix

### Useful Resources
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)
- [Microsoft identity platform OAuth 2.0](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)

### Provider-Specific Notes

#### Microsoft EntraID / Azure AD
- Requires https:// for non-localhost redirect URIs
- Supports `/.default` scope for backward compatibility
- Token endpoint requires `client_secret` even for public clients (can be empty)
- Support for `resource` parameter (legacy) and `scope` parameter

#### Google OAuth 2.0
- Requires consent screen configuration
- Supports incremental authorization
- Refresh tokens only issued on first authorization (use `prompt=consent` to force)

#### GitHub OAuth
- Does not support PKCE (use Authorization Code Flow without PKCE)
- Requires `User-Agent` header in token exchange
- Scopes are space-separated

---

**Document Status**: Ready for Review  
**Last Updated**: February 3, 2026
