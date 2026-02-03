/**
 * OAuth Callback Component
 * Handles OAuth redirect callback and communicates with opener window (popup mode)
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { retrieveOAuthState } from '../helpers/oauth/stateHelper';
import { useOAuthStore } from '../store/useOAuthStore';

export function OAuthCallback() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing OAuth callback...');
  const navigate = useNavigate();
  const { setTokens, getConfig, loadConfigs } = useOAuthStore();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (hasProcessed.current) {
      console.log('[OAuth Callback] Already processed, skipping...');
      return;
    }
    hasProcessed.current = true;
    
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Parse callback parameters from URL
      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.substring(1));

      // Check for errors from OAuth provider
      const error = params.get('error') || hash.get('error');
      if (error) {
        const errorDescription = params.get('error_description') || hash.get('error_description') || error;
        handleError(`OAuth error: ${errorDescription}`);
        return;
      }

      // Get authorization code (for authorization code flow)
      const code = params.get('code');
      
      // Get access token (for implicit flow)
      const accessToken = hash.get('access_token');
      
      // Get state parameter
      const stateParam = params.get('state') || hash.get('state');
      console.log('[OAuth Callback] State param from URL:', stateParam?.substring(0, 10) + '...');
      
      if (!stateParam) {
        console.error('[OAuth Callback] No state parameter in URL');
        handleError('Missing state parameter - possible CSRF attack');
        return;
      }

      // Retrieve and validate stored state
      console.log('[OAuth Callback] Attempting to retrieve stored state...');
      const oauthState = retrieveOAuthState(stateParam);
      console.log('[OAuth Callback] Retrieved state:', oauthState ? 'SUCCESS' : 'FAILED');
      
      if (!oauthState) {
        console.error('[OAuth Callback] State validation failed');
        handleError('Invalid or expired state parameter');
        return;
      }

      const { configId, codeVerifier, redirectUri } = oauthState;
      console.log('[OAuth Callback] Config ID from state:', configId);
      console.log('[OAuth Callback] Code verifier present:', !!codeVerifier);
      console.log('[OAuth Callback] Redirect URI:', redirectUri);
      
      // Get config
      console.log('[OAuth Callback] Attempting to get config...');
      let config = getConfig(configId);
      console.log('[OAuth Callback] Config retrieved:', config ? 'SUCCESS' : 'FAILED');
      
      if (!config) {
        console.error('[OAuth Callback] Config not found in store. Loading configs...');
        // Try loading configs first
        await loadConfigs();
        config = getConfig(configId);
        if (!config) {
          console.error('[OAuth Callback] Config still not found after loading');
          handleError('OAuth configuration not found');
          return;
        }
        console.log('[OAuth Callback] Config found after reload');
      }

      let tokens;
      
      console.log('[OAuth Callback] Using config:', {
        id: config?.id,
        name: config?.name,
        provider: config?.provider,
        flowType: config?.flowType,
      });

      // Handle authorization code flow
      if (code) {
        console.log('[OAuth Callback] Authorization code flow detected');
        setMessage('Exchanging authorization code for tokens...');
        console.log('[OAuth Callback] Exchanging code for tokens...');
        
        try {
          const response = await fetch('/api/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              configId,
              code,
              codeVerifier,
              redirectUri,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Token exchange failed');
          }

          tokens = await response.json();
        } catch (error) {
          handleError(`Token exchange failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return;
        }
      }
      // Handle implicit flow
      else if (accessToken) {
        const tokenType = hash.get('token_type') || 'Bearer';
        const expiresIn = hash.get('expires_in');
        const scope = hash.get('scope');
        const idToken = hash.get('id_token');

        tokens = {
          access_token: accessToken,
          token_type: tokenType,
          expires_in: expiresIn ? parseInt(expiresIn) : undefined,
          scope: scope || undefined,
          id_token: idToken || undefined,
        };
      }
      else {
        handleError('No authorization code or access token received');
        return;
      }

      // Store tokens
      console.log('[OAuth Callback] Storing tokens...');
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

      // If opened as popup, send message to opener
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          {
            type: 'oauth-callback',
            success: true,
            tokens: normalizedTokens,
          },
          window.location.origin
        );
        
        setStatus('success');
        setMessage('Authentication successful! You can close this window.');
        
        // Auto-close popup after 2 seconds
        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        // Full redirect mode - navigate back to app
        setStatus('success');
        setMessage('Authentication successful! Redirecting...');
        
        setTimeout(() => {
          navigate('/');
        }, 1500);
      }

    } catch (error) {
      handleError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleError = (errorMessage: string) => {
    console.error('OAuth callback error:', errorMessage);
    setStatus('error');
    setMessage(errorMessage);

    // If opened as popup, send error to opener
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        {
          type: 'oauth-callback',
          success: false,
          error: errorMessage,
          errorDescription: errorMessage,
        },
        window.location.origin
      );
      
      // Don't auto-close on error, let user read the message
    } else {
      // Full redirect mode - show error and offer to go back
      setTimeout(() => {
        navigate('/');
      }, 5000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Icon */}
        <div className="flex justify-center">
          {status === 'processing' && (
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500" />
          )}
          {status === 'success' && (
            <div className="rounded-full h-16 w-16 bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <svg className="h-10 w-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {status === 'error' && (
            <div className="rounded-full h-16 w-16 bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <svg className="h-10 w-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        {/* Message */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {status === 'processing' && 'Processing...'}
            {status === 'success' && 'Authentication Successful'}
            {status === 'error' && 'Authentication Failed'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {message}
          </p>
        </div>

        {/* Additional actions */}
        {status === 'error' && !(window.opener && !window.opener.closed) && (
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Return to App
          </button>
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
