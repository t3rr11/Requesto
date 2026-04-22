import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle2, XCircle } from 'lucide-react';
import { retrieveOAuthState } from '../helpers/oauth/stateHelper';
import { useOAuthStore } from '../store/oauth/store';
import { API_BASE } from '../helpers/api/config';
import { formatTokenExchangeError } from '../helpers/oauth/oauthFlowHandler';
import { Button } from './Button';

export function OAuthCallback() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing OAuth callback...');
  const navigate = useNavigate();
  const { setTokens, getConfig, loadConfigs } = useOAuthStore();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const fullHash = window.location.hash;
      const hashParts = fullHash.split('?');
      const hashQuery = hashParts[1] || '';
      const params = new URLSearchParams(hashQuery);
      const searchParams = new URLSearchParams(window.location.search);
      const fragmentAfterPath = hashQuery ? new URLSearchParams(hashQuery) : new URLSearchParams();

      const error = params.get('error') || searchParams.get('error') || fragmentAfterPath.get('error');
      if (error) {
        const errorDescription = params.get('error_description') || searchParams.get('error_description') || fragmentAfterPath.get('error_description') || error;
        handleError(`OAuth error: ${errorDescription}`);
        return;
      }

      const code = params.get('code') || searchParams.get('code');
      const accessToken = fragmentAfterPath.get('access_token');
      const stateParam = params.get('state') || searchParams.get('state') || fragmentAfterPath.get('state');

      if (!stateParam) {
        handleError('Missing state parameter - possible CSRF attack');
        return;
      }

      const oauthState = retrieveOAuthState(stateParam);
      if (!oauthState) {
        handleError('Invalid or expired state parameter');
        return;
      }

      const { configId, codeVerifier, redirectUri } = oauthState;

      let config = getConfig(configId);
      if (!config) {
        await loadConfigs();
        config = getConfig(configId);
        if (!config) {
          handleError('OAuth configuration not found');
          return;
        }
      }

      let tokens;

      if (code) {
        setMessage('Exchanging authorization code for tokens...');
        const response = await fetch(`${API_BASE}/oauth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ configId, code, codeVerifier, redirectUri }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          handleError(formatTokenExchangeError(errorData));
          return;
        }
        tokens = await response.json();
      } else if (accessToken) {
        const tokenType = fragmentAfterPath.get('token_type') || 'Bearer';
        const expiresIn = fragmentAfterPath.get('expires_in');
        const scope = fragmentAfterPath.get('scope');
        const idToken = fragmentAfterPath.get('id_token');
        tokens = {
          access_token: accessToken,
          token_type: tokenType,
          expires_in: expiresIn ? parseInt(expiresIn) : undefined,
          scope: scope || undefined,
          id_token: idToken || undefined,
        };
      } else {
        handleError('No authorization code or access token received');
        return;
      }

      setMessage('Storing tokens...');
      const normalizedTokens = {
        accessToken: tokens.access_token,
        tokenType: tokens.token_type,
        expiresIn: tokens.expires_in,
        expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined,
        refreshToken: tokens.refresh_token,
        scope: tokens.scope,
        idToken: tokens.id_token,
      };

      setTokens(configId, normalizedTokens, config.tokenStorage);

      if (window.opener && !window.opener.closed) {
        // Use '*' as targetOrigin because in some environments (e.g. Electron dev
        // mode) the opener's origin may differ from the popup's origin.
        window.opener.postMessage(
          { type: 'oauth-callback', success: true, tokens: normalizedTokens },
          '*',
        );
        setStatus('success');
        setMessage('Authentication successful! You can close this window.');
        setTimeout(() => window.close(), 2000);
      } else {
        setStatus('success');
        setMessage('Authentication successful!');
        setTimeout(() => navigate('/'), 1500);
      }
    } catch (err) {
      handleError(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleError = (errorMessage: string) => {
    console.error('OAuth callback error:', errorMessage);
    setStatus('error');
    setMessage(errorMessage);

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: 'oauth-callback', success: false, error: errorMessage, errorDescription: errorMessage },
        '*',
      );
    } else {
      setTimeout(() => navigate('/'), 5000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex justify-center">
          {status === 'processing' && (
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500" />
          )}
          {status === 'success' && (
            <div className="rounded-full h-16 w-16 bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
          )}
          {status === 'error' && (
            <div className="rounded-full h-16 w-16 bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {status === 'processing' && 'Processing...'}
            {status === 'success' && 'Authentication Successful'}
            {status === 'error' && 'Authentication Failed'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap wrap-break-word text-left">{message}</p>
        </div>

        {status === 'error' && !(window.opener && !window.opener.closed) && (
          <Button onClick={() => navigate('/')} variant="primary" className="mt-4">
            Return to App
          </Button>
        )}

        {status === 'success' && !(window.opener && !window.opener.closed) && (
          <Button onClick={() => navigate('/')} variant="primary" className="mt-4">
            Return to App
          </Button>
        )}

        {status === 'success' && window.opener && !window.opener.closed && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            This window will close automatically...
          </p>
        )}
      </div>
    </div>
  );
}
