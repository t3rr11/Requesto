/**
 * OAuth Routes
 * Handles OAuth configuration management and secure token exchange
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import axios from 'axios';
import {
  getAllConfigs,
  getConfig,
  createConfig,
  updateConfig,
  deleteConfig,
  getClientSecret,
} from '../database/oauth';
import {
  OAuthConfigServer,
  TokenExchangeRequest,
  TokenExchangeResponse,
  TokenRefreshRequest,
} from '../types';

export async function oauthRoutes(server: FastifyInstance) {
  
  // Get all OAuth configurations (without secrets)
  server.get('/oauth/configs', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const configs = getAllConfigs();
      return reply.code(200).send(configs);
    } catch (error) {
      console.error('Error getting OAuth configs:', error);
      return reply.code(500).send({
        error: 'Failed to retrieve OAuth configurations',
      });
    }
  });

  // Get a specific OAuth configuration (without secret)
  server.get<{ Params: { id: string } }>(
    '/oauth/configs/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const config = getConfig(id, false);
        
        if (!config) {
          return reply.code(404).send({ error: 'OAuth configuration not found' });
        }
        
        return reply.code(200).send(config);
      } catch (error) {
        console.error('Error getting OAuth config:', error);
        return reply.code(500).send({
          error: 'Failed to retrieve OAuth configuration',
        });
      }
    }
  );

  // Create new OAuth configuration
  server.post<{ Body: Omit<OAuthConfigServer, 'id' | 'createdAt' | 'updatedAt'> }>(
    '/oauth/configs',
    async (request: FastifyRequest<{ Body: Omit<OAuthConfigServer, 'id' | 'createdAt' | 'updatedAt'> }>, reply: FastifyReply) => {
      try {
        const configData = request.body;
        
        // Validation
        if (!configData.name || !configData.provider || !configData.clientId) {
          return reply.code(400).send({
            error: 'Missing required fields: name, provider, clientId',
          });
        }
        
        if (!configData.authorizationUrl || !configData.tokenUrl) {
          return reply.code(400).send({
            error: 'Missing required fields: authorizationUrl, tokenUrl',
          });
        }
        
        const newConfig = createConfig(configData);
        return reply.code(201).send(newConfig);
      } catch (error) {
        console.error('Error creating OAuth config:', error);
        return reply.code(500).send({
          error: 'Failed to create OAuth configuration',
        });
      }
    }
  );

  // Update OAuth configuration
  server.patch<{ 
    Params: { id: string };
    Body: Partial<Omit<OAuthConfigServer, 'id' | 'createdAt'>>;
  }>(
    '/oauth/configs/:id',
    async (request: FastifyRequest<{ 
      Params: { id: string };
      Body: Partial<Omit<OAuthConfigServer, 'id' | 'createdAt'>>;
    }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const updates = request.body;
        
        const updatedConfig = updateConfig(id, updates);
        
        if (!updatedConfig) {
          return reply.code(404).send({ error: 'OAuth configuration not found' });
        }
        
        return reply.code(200).send(updatedConfig);
      } catch (error) {
        console.error('Error updating OAuth config:', error);
        return reply.code(500).send({
          error: 'Failed to update OAuth configuration',
        });
      }
    }
  );

  // Delete OAuth configuration
  server.delete<{ Params: { id: string } }>(
    '/oauth/configs/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const deleted = deleteConfig(id);
        
        if (!deleted) {
          return reply.code(404).send({ error: 'OAuth configuration not found' });
        }
        
        return reply.code(204).send();
      } catch (error) {
        console.error('Error deleting OAuth config:', error);
        return reply.code(500).send({
          error: 'Failed to delete OAuth configuration',
        });
      }
    }
  );

  // Exchange authorization code for access token
  // This is the SECURE endpoint that adds client_secret server-side
  server.post<{ Body: TokenExchangeRequest }>(
    '/oauth/token',
    async (request: FastifyRequest<{ Body: TokenExchangeRequest }>, reply: FastifyReply) => {
      try {
        const { configId, code, codeVerifier, redirectUri } = request.body;
        
        // Validation
        if (!configId || !code || !redirectUri) {
          return reply.code(400).send({
            error: 'Missing required fields: configId, code, redirectUri',
          });
        }
        
        // Get config with secret
        const config = getConfig(configId, true) as OAuthConfigServer | null;
        if (!config) {
          return reply.code(404).send({ error: 'OAuth configuration not found' });
        }
        
        // Get client secret
        const clientSecret = getClientSecret(configId);
        
        // Log for debugging
        console.log('[OAuth Token Exchange] Config:', {
          provider: config.provider,
          usePKCE: config.usePKCE,
          hasSecret: !!clientSecret,
          hasCodeVerifier: !!codeVerifier,
        });
        
        // Prepare token request
        const tokenRequestBody: Record<string, string> = {
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: config.clientId,
        };
        
        // Add client secret if available (required for confidential clients)
        if (clientSecret) {
          tokenRequestBody.client_secret = clientSecret;
        }
        
        // Add code_verifier for PKCE (required for public clients using PKCE)
        if (codeVerifier && config.usePKCE) {
          tokenRequestBody.code_verifier = codeVerifier;
        }
        
        // Microsoft Entra ID requires client_secret even with PKCE for Web apps
        if (config.provider === 'microsoft' && !clientSecret && !codeVerifier) {
          return reply.code(400).send({
            error: 'Configuration Error',
            message: 'Microsoft Entra ID requires either a client_secret (for Web apps) or PKCE with code_verifier (for Public clients). Please update your OAuth configuration.',
          });
        }
        
        // Add any additional params from config
        if (config.additionalParams) {
          Object.assign(tokenRequestBody, config.additionalParams);
        }
        
        // Special handling for GitHub (requires User-Agent header)
        const headers: Record<string, string> = {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        };
        
        if (config.provider === 'github') {
          headers['User-Agent'] = 'Requesto-OAuth-Client';
        }
        
        // Exchange code for token
        console.log(`Exchanging OAuth code for config ${configId} (provider: ${config.provider})`);
        
        const tokenResponse = await axios.post<TokenExchangeResponse>(
          config.tokenUrl,
          new URLSearchParams(tokenRequestBody).toString(),
          { headers }
        );
        
        // Return tokens to frontend (frontend will store them)
        // IMPORTANT: Backend does NOT store these tokens
        return reply.code(200).send(tokenResponse.data);
        
      } catch (error) {
        console.error('Error exchanging OAuth code:', error);
        
        if (axios.isAxiosError(error)) {
          const status = error.response?.status || 500;
          const data = error.response?.data;
          
          return reply.code(status).send({
            error: 'Token exchange failed',
            details: data || error.message,
          });
        }
        
        return reply.code(500).send({
          error: 'Failed to exchange authorization code for token',
        });
      }
    }
  );

  // Refresh access token
  server.post<{ Body: TokenRefreshRequest }>(
    '/oauth/refresh',
    async (request: FastifyRequest<{ Body: TokenRefreshRequest }>, reply: FastifyReply) => {
      try {
        const { configId, refreshToken } = request.body;
        
        // Validation
        if (!configId || !refreshToken) {
          return reply.code(400).send({
            error: 'Missing required fields: configId, refreshToken',
          });
        }
        
        // Get config with secret
        const config = getConfig(configId, true) as OAuthConfigServer | null;
        if (!config) {
          return reply.code(404).send({ error: 'OAuth configuration not found' });
        }
        
        // Get client secret
        const clientSecret = getClientSecret(configId);
        
        // Prepare refresh request
        const refreshRequestBody: Record<string, string> = {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: config.clientId,
        };
        
        // Add client secret if available
        if (clientSecret) {
          refreshRequestBody.client_secret = clientSecret;
        }
        
        // Add any additional params from config
        if (config.additionalParams) {
          Object.assign(refreshRequestBody, config.additionalParams);
        }
        
        // Special handling for GitHub (requires User-Agent header)
        const headers: Record<string, string> = {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        };
        
        if (config.provider === 'github') {
          headers['User-Agent'] = 'Requesto-OAuth-Client';
        }
        
        // Refresh token
        console.log(`Refreshing OAuth token for config ${configId} (provider: ${config.provider})`);
        
        const tokenResponse = await axios.post<TokenExchangeResponse>(
          config.tokenUrl,
          new URLSearchParams(refreshRequestBody).toString(),
          { headers }
        );
        
        // Return new tokens to frontend
        return reply.code(200).send(tokenResponse.data);
        
      } catch (error) {
        console.error('Error refreshing OAuth token:', error);
        
        if (axios.isAxiosError(error)) {
          const status = error.response?.status || 500;
          const data = error.response?.data;
          
          return reply.code(status).send({
            error: 'Token refresh failed',
            details: data || error.message,
          });
        }
        
        return reply.code(500).send({
          error: 'Failed to refresh access token',
        });
      }
    }
  );

  // Revoke OAuth token
  server.post<{ Body: { configId: string; token: string; tokenTypeHint?: string } }>(
    '/oauth/revoke',
    async (request: FastifyRequest<{ Body: { configId: string; token: string; tokenTypeHint?: string } }>, reply: FastifyReply) => {
      try {
        const { configId, token, tokenTypeHint } = request.body;
        
        // Validation
        if (!configId || !token) {
          return reply.code(400).send({
            error: 'Missing required fields: configId, token',
          });
        }
        
        // Get config with secret
        const config = getConfig(configId, true) as OAuthConfigServer | null;
        if (!config) {
          return reply.code(404).send({ error: 'OAuth configuration not found' });
        }
        
        // Check if provider supports revocation
        if (!config.revocationUrl) {
          return reply.code(400).send({
            error: 'Token revocation not supported by this provider',
          });
        }
        
        // Get client secret
        const clientSecret = getClientSecret(configId);
        
        // Prepare revocation request
        const revokeRequestBody: Record<string, string> = {
          token,
          client_id: config.clientId,
        };
        
        // Add client secret if available
        if (clientSecret) {
          revokeRequestBody.client_secret = clientSecret;
        }
        
        // Add token type hint if provided
        if (tokenTypeHint) {
          revokeRequestBody.token_type_hint = tokenTypeHint;
        }
        
        // Special handling for different providers
        const headers: Record<string, string> = {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        };
        
        if (config.provider === 'github') {
          headers['User-Agent'] = 'Requesto-OAuth-Client';
        }
        
        // Revoke token
        console.log(`Revoking OAuth token for config ${configId} (provider: ${config.provider})`);
        
        try {
          await axios.post(
            config.revocationUrl,
            new URLSearchParams(revokeRequestBody).toString(),
            { headers }
          );
          
          // Revocation successful (or provider doesn't return error for invalid tokens)
          return reply.code(200).send({ success: true });
        } catch (revokeError) {
          // Some providers return 200 even for already-revoked tokens
          // Others might return 400 or 401
          if (axios.isAxiosError(revokeError)) {
            const status = revokeError.response?.status;
            // Treat 400/401 as success if the error indicates token is already invalid
            if (status === 400 || status === 401) {
              return reply.code(200).send({ success: true, note: 'Token may have been already revoked' });
            }
          }
          throw revokeError;
        }
        
      } catch (error) {
        console.error('Error revoking OAuth token:', error);
        
        if (axios.isAxiosError(error)) {
          const status = error.response?.status || 500;
          const data = error.response?.data;
          
          return reply.code(status).send({
            error: 'Token revocation failed',
            details: data || error.message,
          });
        }
        
        return reply.code(500).send({
          error: 'Failed to revoke token',
        });
      }
    }
  );

  // Client Credentials Flow
  server.post<{ Body: { configId: string } }>(
    '/oauth/client-credentials',
    async (request: FastifyRequest<{ Body: { configId: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.body;
        
        // Validation
        if (!configId) {
          return reply.code(400).send({
            error: 'Missing required field: configId',
          });
        }
        
        // Get config with secret
        const config = getConfig(configId, true) as OAuthConfigServer | null;
        if (!config) {
          return reply.code(404).send({ error: 'OAuth configuration not found' });
        }
        
        // Get client secret
        const clientSecret = getClientSecret(configId);
        if (!clientSecret) {
          return reply.code(400).send({
            error: 'Client secret required for client credentials flow',
          });
        }
        
        // Prepare token request
        const tokenRequestBody: Record<string, string> = {
          grant_type: 'client_credentials',
          client_id: config.clientId,
          client_secret: clientSecret,
        };
        
        // Add scopes if provided
        if (config.scopes && config.scopes.length > 0) {
          tokenRequestBody.scope = config.scopes.join(' ');
        }
        
        // Add any additional params from config
        if (config.additionalParams) {
          Object.assign(tokenRequestBody, config.additionalParams);
        }
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        };
        
        if (config.provider === 'github') {
          headers['User-Agent'] = 'Requesto-OAuth-Client';
        }
        
        // Request token
        console.log(`Client credentials flow for config ${configId} (provider: ${config.provider})`);
        
        const tokenResponse = await axios.post<TokenExchangeResponse>(
          config.tokenUrl,
          new URLSearchParams(tokenRequestBody).toString(),
          { headers }
        );
        
        // Return tokens to frontend
        return reply.code(200).send(tokenResponse.data);
        
      } catch (error) {
        console.error('Error in client credentials flow:', error);
        
        if (axios.isAxiosError(error)) {
          const status = error.response?.status || 500;
          const data = error.response?.data;
          
          return reply.code(status).send({
            error: 'Client credentials flow failed',
            details: data || error.message,
          });
        }
        
        return reply.code(500).send({
          error: 'Failed to execute client credentials flow',
        });
      }
    }
  );

  // Password Flow (Resource Owner Password Credentials)
  server.post<{ Body: { configId: string; username: string; password: string } }>(
    '/oauth/password',
    async (request: FastifyRequest<{ Body: { configId: string; username: string; password: string } }>, reply: FastifyReply) => {
      try {
        const { configId, username, password } = request.body;
        
        // Validation
        if (!configId || !username || !password) {
          return reply.code(400).send({
            error: 'Missing required fields: configId, username, password',
          });
        }
        
        // Get config with secret
        const config = getConfig(configId, true) as OAuthConfigServer | null;
        if (!config) {
          return reply.code(404).send({ error: 'OAuth configuration not found' });
        }
        
        // Get client secret
        const clientSecret = getClientSecret(configId);
        
        // Prepare token request
        const tokenRequestBody: Record<string, string> = {
          grant_type: 'password',
          username,
          password,
          client_id: config.clientId,
        };
        
        // Add client secret if available
        if (clientSecret) {
          tokenRequestBody.client_secret = clientSecret;
        }
        
        // Add scopes if provided
        if (config.scopes && config.scopes.length > 0) {
          tokenRequestBody.scope = config.scopes.join(' ');
        }
        
        // Add any additional params from config
        if (config.additionalParams) {
          Object.assign(tokenRequestBody, config.additionalParams);
        }
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        };
        
        if (config.provider === 'github') {
          headers['User-Agent'] = 'Requesto-OAuth-Client';
        }
        
        // Request token
        console.log(`Password flow for config ${configId} (provider: ${config.provider})`);
        
        const tokenResponse = await axios.post<TokenExchangeResponse>(
          config.tokenUrl,
          new URLSearchParams(tokenRequestBody).toString(),
          { headers }
        );
        
        // Return tokens to frontend
        return reply.code(200).send(tokenResponse.data);
        
      } catch (error) {
        console.error('Error in password flow:', error);
        
        if (axios.isAxiosError(error)) {
          const status = error.response?.status || 500;
          const data = error.response?.data;
          
          return reply.code(status).send({
            error: 'Password flow failed',
            details: data || error.message,
          });
        }
        
        return reply.code(500).send({
          error: 'Failed to execute password flow',
        });
      }
    }
  );
}
