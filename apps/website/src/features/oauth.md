# OAuth 2.0

Requesto has built-in OAuth 2.0 support with automatic token management.

## Supported Grant Types

- **Authorization Code** - standard server-side flow
- **Authorization Code with PKCE** - PKCE challenge/verifier generated automatically
- **Implicit** - browser-based (deprecated in OAuth 2.1)
- **Client Credentials** - server-to-server, no user involved
- **Resource Owner Password** - direct username/password exchange

## Creating a Configuration

1. Go to the **OAuth 2.0** page
2. Click **New Configuration**
3. Fill in the fields for your chosen grant type
4. Click **Save**

Common fields:

| Field | Description |
|-------|-------------|
| Client ID | From your OAuth provider |
| Client Secret | From your OAuth provider (stored server-side only) |
| Authorization URL | Provider's authorize endpoint |
| Token URL | Provider's token endpoint |
| Redirect URI | Auto-detected from your browser URL - typically `http://localhost:5173/oauth/callback` in dev or `http://localhost:4000/oauth/callback` in Docker |
| Scopes | Space-separated list of permissions |

## Authorizing

1. Click **Authorize** on your config
2. A browser window opens to the provider's login page
3. After granting access, the provider redirects back to Requesto
4. The access token is stored client-side

## Using a Token in Requests

In a request's **Auth** tab:
1. Select **OAuth 2.0** as the auth type
2. Pick your saved configuration
3. Send the request - the token is added as `Authorization: Bearer <token>`

## Token Storage

- **Access tokens and refresh tokens**: stored client-side (sessionStorage or localStorage, depending on your config choice)
- **Client secrets**: stored server-side only in `oauth-configs.json` - never exposed to the frontend

Choose **Session** storage if tokens should be cleared when the browser tab closes, or **Persistent** if you want them to survive across sessions.

## Automatic Refresh

If **Auto Refresh Tokens** is enabled on a config:
- Requesto will automatically refresh the token before it expires
- The refresh threshold (seconds before expiry) is configurable per config

You can also manually refresh by clicking **Refresh Token** on the OAuth page.

## PKCE

When using the **Authorization Code with PKCE** grant type, PKCE is handled automatically - a code verifier and SHA-256 code challenge are generated with no extra configuration.

A `state` parameter is also generated automatically for CSRF protection on all authorization code flows.

## Provider Examples

### GitHub

```
Grant Type: Authorization Code
Authorization URL: https://github.com/login/oauth/authorize
Token URL: https://github.com/login/oauth/access_token
Scope: user repo
```

[Create a GitHub OAuth App](https://github.com/settings/developers)

### Google

```
Grant Type: Authorization Code with PKCE
Authorization URL: https://accounts.google.com/o/oauth2/v2/auth
Token URL: https://oauth2.googleapis.com/token
Scope: openid https://www.googleapis.com/auth/userinfo.email
```

[Create a Google OAuth Client](https://console.cloud.google.com/apis/credentials)

### Spotify

```
Grant Type: Authorization Code with PKCE
Authorization URL: https://accounts.spotify.com/authorize
Token URL: https://accounts.spotify.com/api/token
Scope: user-read-private user-read-email
```

[Create a Spotify App](https://developer.spotify.com/dashboard/applications)

## Troubleshooting

**"Invalid Redirect URI"** - The redirect URI registered with your provider must exactly match what Requesto sends. Check the auto-detected URI shown in the config form and register that exact value with your provider.

**Token not refreshing** - Make sure Auto Refresh is enabled in the config, and that your provider actually issued a refresh token (not all do).

**Authorization window not opening** - Check that your browser isn't blocking the popup. Verify the authorization URL is correct.
