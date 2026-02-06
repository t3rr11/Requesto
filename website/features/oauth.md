# OAuth 2.0

Built-in OAuth 2.0 support with automatic token management.

## What is OAuth 2.0?

OAuth 2.0 is an authorization framework that lets applications access APIs on behalf of users without sharing passwords.

Requesto supports all OAuth 2.0 grant types:
- Authorization Code
- Authorization Code with PKCE
- Implicit Grant
- Client Credentials
- Resource Owner Password Credentials

## Creating an OAuth Configuration

1. Navigate to **OAuth 2.0** tab
2. Click **New Configuration**
3. Fill in the configuration form
4. Click **Save**

## Grant Types

### Authorization Code (Most Common)

Used by server-side web applications.

**Required Fields**:
- **Client ID**: From API provider
- **Client Secret**: From API provider
- **Authorization URL**: Provider's auth endpoint
- **Token URL**: Provider's token endpoint
- **Redirect URI**: `http://localhost:5173/oauth/callback` (or your URL)
- **Scopes**: Space-separated list (e.g., `read write`)

**Example (GitHub)**:
```
Grant Type: Authorization Code
Authorization URL: https://github.com/login/oauth/authorize
Token URL: https://github.com/login/oauth/access_token
Client ID: your_client_id
Client Secret: your_client_secret
Redirect URI: http://localhost:5173/oauth/callback
Scope: user repo
```

### Authorization Code with PKCE

More secure, designed for mobile and single-page apps.

Same as Authorization Code, but PKCE is handled automatically.

**Example (Spotify)**:
```
Grant Type: Authorization Code with PKCE
Authorization URL: https://accounts.spotify.com/authorize
Token URL: https://accounts.spotify.com/api/token
Client ID: your_client_id
Redirect URI: http://localhost:5173/oauth/callback
Scope: user-read-private user-read-email
```

### Client Credentials

For server-to-server authentication (no user involved).

**Required Fields**:
- **Client ID**
- **Client Secret**
- **Token URL**

**Example**:
```
Grant Type: Client Credentials
Token URL: https://api.example.com/oauth/token
Client ID: your_client_id
Client Secret: your_client_secret
Scope: api.read api.write
```

### Implicit Grant

Simplified flow for browser-based apps (less secure, deprecated in OAuth 2.1).

**Required Fields**:
- **Client ID**
- **Authorization URL**
- **Redirect URI**

### Resource Owner Password

User provides credentials directly (not recommended unless you control both client and server).

**Required Fields**:
- **Token URL**
- **Client ID**
- **Client Secret**
- **Username**
- **Password**

## Using OAuth in Requests

### 1. Create Configuration

Set up your OAuth config as described above.

### 2. Authorize

1. In the OAuth 2.0 tab, click **Authorize** next to your config
2. Browser opens to provider's login page
3. Log in and grant permissions
4. Browser redirects back to Requesto
5. Access token is stored

### 3. Use in Requests

In a request's **Auth** tab:
1. Select **OAuth 2.0**
2. Choose your saved configuration
3. Send request - token is automatically added

Requesto adds the token to the `Authorization` header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Token Management

### Automatic Refresh

Enable automatic token refresh:

1. Edit OAuth configuration
2. Check **Auto Refresh Tokens**
3. Set **Refresh Threshold** (seconds before expiry)

Requesto automatically refreshes tokens before they expire.

### Manual Refresh

1. Go to OAuth 2.0 tab
2. Click **Refresh Token** next to configuration

### Token Storage

- **Access Tokens**: Stored client-side (sessionStorage or localStorage)
- **Refresh Tokens**: Stored client-side
- **Client Secrets**: Stored server-side only (more secure)

Choose storage type when creating configuration:
- **Session**: Tokens cleared when browser closes
- **Persistent**: Tokens persist across sessions

## Security Best Practices

### Client Secret Protection

- Never share OAuth configurations with client secrets
- Use environment variables for secrets when possible
- Regenerate secrets if exposed

### Redirect URI

- Use exact URL (no wildcards)
- For desktop app: `http://localhost:5173/oauth/callback`
- For production: Your actual domain

### Scopes

Request only the scopes you need:
```
Good: user.read user.write
Bad: user.* admin.*
```

### Token Storage

- Choose **Session** storage for shared computers
- Choose **Persistent** for personal devices
- Tokens are never sent to backend (stay client-side)

## Provider-Specific Examples

### GitHub

```
Grant Type: Authorization Code
Authorization URL: https://github.com/login/oauth/authorize
Token URL: https://github.com/login/oauth/access_token
Client ID: <from GitHub OAuth App>
Client Secret: <from GitHub OAuth App>
Redirect URI: http://localhost:5173/oauth/callback
Scope: user repo
```

[Create OAuth App](https://github.com/settings/developers)

### Google

```
Grant Type: Authorization Code with PKCE
Authorization URL: https://accounts.google.com/o/oauth2/v2/auth
Token URL: https://oauth2.googleapis.com/token
Client ID: <from Google Cloud Console>
Client Secret: <from Google Cloud Console>
Redirect URI: http://localhost:5173/oauth/callback
Scope: https://www.googleapis.com/auth/userinfo.email openid
```

[Create OAuth Client](https://console.cloud.google.com/apis/credentials)

### Microsoft / Azure AD

```
Grant Type: Authorization Code
Authorization URL: https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize
Token URL: https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
Client ID: <from Azure App Registration>
Client Secret: <from Azure App Registration>
Redirect URI: http://localhost:5173/oauth/callback
Scope: https://graph.microsoft.com/.default
```

Replace `{tenant}` with your tenant ID or `common`.

### Spotify

```
Grant Type: Authorization Code with PKCE
Authorization URL: https://accounts.spotify.com/authorize
Token URL: https://accounts.spotify.com/api/token
Client ID: <from Spotify Dashboard>
Client Secret: <from Spotify Dashboard>
Redirect URI: http://localhost:5173/oauth/callback
Scope: user-read-private user-read-email playlist-modify-public
```

[Create Spotify App](https://developer.spotify.com/dashboard/applications)

### Twitter / X

```
Grant Type: Authorization Code with PKCE
Authorization URL: https://twitter.com/i/oauth2/authorize
Token URL: https://api.twitter.com/2/oauth2/token
Client ID: <from Twitter Developer Portal>
Client Secret: <from Twitter Developer Portal>
Redirect URI: http://localhost:5173/oauth/callback
Scope: tweet.read tweet.write users.read
```

## Troubleshooting

### "Invalid Redirect URI" Error

**Cause**: Redirect URI doesn't match what's registered with provider

**Solution**:
1. Check OAuth app settings at provider
2. Add exact URL: `http://localhost:5173/oauth/callback`
3. Include protocol (`http://`) and port (`:5173`)

### "Invalid Scope" Error

**Cause**: Requested scope not available or wrong format

**Solution**:
- Check provider documentation for valid scopes
- Use space-separated format: `scope1 scope2`
- Some providers use comma-separated: `scope1,scope2`

### Token Not Refreshing

**Checks**:
- Is **Auto Refresh** enabled in config?
- Does provider support refresh tokens?
- Is refresh token present in storage?
- Check console for error messages

### Authorization Window Not Opening

**Causes**:
- Popup blocked by browser
- Authorization URL incorrect

**Solutions**:
- Allow popups for Requesto
- Verify Authorization URL is correct
- Try manual authorization in new tab

### Token Expired

**Solution**:
1. Click **Refresh Token** in OAuth 2.0 tab
2. Or re-authorize by clicking **Authorize** again

## Advanced Configuration

### Custom Headers

Add custom headers to token request:

```json
{
  "customHeaders": {
    "X-Custom-Header": "value"
  }
}
```

### Token Exchange Parameters

Add extra parameters to token exchange:

```json
{
  "tokenExchangeParams": {
    "resource": "https://api.example.com"
  }
}
```

### State Parameter

Requesto automatically generates a `state` parameter for CSRF protection.

### PKCE

For "Authorization Code with PKCE":
- Code verifier automatically generated
- Code challenge computed (SHA-256)
- No additional configuration needed

## Testing OAuth Flow

### 1. Set Up Test Configuration

Use provider's test/sandbox credentials:
```
Client ID: test_client_id
Client Secret: test_secret
```

### 2. Test Authorization

1. Click **Authorize**
2. Verify redirect to provider
3. Complete authorization
4. Verify redirect back to Requesto
5. Check token appears in configuration

### 3. Test Request

Create a test request:
```
GET https://api.example.com/user
Auth: OAuth 2.0 → Select your config
```

Send and verify response.

### 4. Test Token Refresh

1. Manually expire token (or wait)
2. Send request again
3. Verify automatic refresh occurs
4. Check console for refresh logs

## Best Practices

- **One Config Per API**: Create separate configs for each API provider
- **Descriptive Names**: Use clear names like "GitHub - Personal" or "Google - Prod"
- **Document Scopes**: Keep notes on what each scope is used for
- **Regular Rotation**: Regenerate client secrets periodically
- **Test Environment First**: Test OAuth flow in development before production
- **Handle Errors**: Check response for auth errors and re-authorize if needed
