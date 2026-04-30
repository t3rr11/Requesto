import { FastifyPluginAsync } from 'fastify';
import axios from 'axios';
import { OAuthService } from '../services/oauth.service';
import type { OAuthConfigServer } from '../models/oauth';

interface Options {
  oauthService: OAuthService;
}

/**
 * Detects well-known provider errors that have non-obvious root causes and
 * augments them with an actionable hint so users aren't left guessing.
 */
function decorateProviderError(details: unknown): unknown {
  if (!details || typeof details !== 'object') return details;
  const d = details as Record<string, unknown>;
  const desc = typeof d.error_description === 'string' ? d.error_description : '';

  // Microsoft EntraID: PKCE flow rejected because the redirect URI is
  // registered under the "Web" platform (which always requires client_secret)
  // instead of "Mobile and desktop applications" or "Single-page application".
  if (desc.includes('AADSTS7000218')) {
    return {
      ...d,
      hint:
        "Your Azure AD app registration has the redirect URI registered under the 'Web' platform, which requires a client_secret even when using PKCE. " +
        "To fix: open your app registration in the Azure portal → Authentication, remove the redirect URI from the 'Web' section, " +
        "and add it under 'Mobile and desktop applications' (recommended for desktop apps like Requesto). " +
        "Then enable 'Allow public client flows' under Advanced settings. " +
        "Alternatively, add a client_secret to your OAuth configuration in Requesto.",
    };
  }

  // Microsoft EntraID: redirect URI is registered under the "Single-page
  // application" platform, which Azure restricts to browser-originated CORS
  // requests only. Server-side token exchange (which Requesto uses) is
  // refused for SPA clients regardless of PKCE.
  if (desc.includes('AADSTS9002327')) {
    return {
      ...d,
      hint:
        "Your Azure AD app registration has the redirect URI registered under the 'Single-page application' platform, " +
        "which only accepts token requests directly from the browser via CORS. Requesto exchanges tokens through its backend, " +
        "so Azure rejects the request. To fix: open your app registration in the Azure portal → Authentication, " +
        "remove the redirect URI from the 'Single-page application' section, and add it under 'Mobile and desktop applications' instead. " +
        "Then enable 'Allow public client flows' under Advanced settings.",
    };
  }

  return details;
}

const oauthController: FastifyPluginAsync<Options> = async (server, opts) => {
  const { oauthService } = opts;

  server.get('/oauth/configs', async () => {
    return oauthService.getAll();
  });

  server.get<{ Params: { id: string } }>('/oauth/configs/:id', async (request, _reply) => {
    return oauthService.getById(request.params.id);
  });

  server.post<{ Body: Omit<OAuthConfigServer, 'id'> }>(
    '/oauth/configs',
    async (request, reply) => {
      const configData = request.body;
      if (!configData.name || !configData.provider || !configData.clientId) {
        return reply.code(400).send({ error: 'Missing required fields: name, provider, clientId' });
      }
      if (!configData.authorizationUrl || !configData.tokenUrl) {
        return reply.code(400).send({ error: 'Missing required fields: authorizationUrl, tokenUrl' });
      }
      const config = oauthService.create(configData);
      return reply.code(201).send(config);
    },
  );

  server.patch<{ Params: { id: string }; Body: Partial<Omit<OAuthConfigServer, 'id'>> }>(
    '/oauth/configs/:id',
    async (request, _reply) => {
      return oauthService.update(request.params.id, request.body);
    },
  );

  server.delete<{ Params: { id: string } }>('/oauth/configs/:id', async (request, reply) => {
    oauthService.delete(request.params.id);
    return reply.code(204).send();
  });

  server.get<{ Params: { id: string } }>('/oauth/configs/:id/tokens', async (request) => {
    return oauthService.getTokenStatus(request.params.id);
  });

  server.delete<{ Params: { id: string } }>('/oauth/configs/:id/tokens', async (request, reply) => {
    oauthService.clearTokens(request.params.id);
    return reply.code(204).send();
  });

  server.post<{ Body: { configId: string; code: string; codeVerifier?: string; redirectUri: string; insecureTls?: boolean } }>(
    '/oauth/token',
    async (request, reply) => {
      const { configId, code, codeVerifier, redirectUri, insecureTls } = request.body;
      if (!configId || !code || !redirectUri) {
        return reply.code(400).send({ error: 'Missing required fields: configId, code, redirectUri' });
      }

      try {
        const result = await oauthService.exchangeToken({ configId, code, codeVerifier, redirectUri, insecureTls });
        return reply.code(200).send(result);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          return reply.code(error.response?.status || 500).send({
            error: 'Token exchange failed',
            details: decorateProviderError(error.response?.data || error.message),
          });
        }
        throw error;
      }
    },
  );

  server.post<{ Body: { configId: string; refreshToken?: string; insecureTls?: boolean } }>(
    '/oauth/refresh',
    async (request, reply) => {
      const { configId, refreshToken, insecureTls } = request.body;
      if (!configId) {
        return reply.code(400).send({ error: 'Missing required field: configId' });
      }

      try {
        const result = await oauthService.refreshToken({ configId, refreshToken, insecureTls });
        return reply.code(200).send(result);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          return reply.code(error.response?.status || 500).send({
            error: 'Token refresh failed',
            details: error.response?.data || error.message,
          });
        }
        throw error;
      }
    },
  );

  server.post<{ Body: { configId: string; token?: string; tokenTypeHint?: string; insecureTls?: boolean } }>(
    '/oauth/revoke',
    async (request, reply) => {
      const { configId, token, tokenTypeHint, insecureTls } = request.body;
      if (!configId) {
        return reply.code(400).send({ error: 'Missing required field: configId' });
      }

      try {
        const result = await oauthService.revokeToken({ configId, token, tokenTypeHint, insecureTls });
        return reply.code(200).send(result);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          return reply.code(error.response?.status || 500).send({
            error: 'Token revocation failed',
            details: error.response?.data || error.message,
          });
        }
        throw error;
      }
    },
  );

  server.post<{ Body: { configId: string; insecureTls?: boolean } }>('/oauth/client-credentials', async (request, reply) => {
    const { configId, insecureTls } = request.body;
    if (!configId) {
      return reply.code(400).send({ error: 'Missing required field: configId' });
    }

    try {
      const result = await oauthService.clientCredentials({ configId, insecureTls });
      return reply.code(200).send(result);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return reply.code(error.response?.status || 500).send({
          error: 'Client credentials flow failed',
          details: error.response?.data || error.message,
        });
      }
      throw error;
    }
  });

  server.post<{ Body: { configId: string; username: string; password: string; insecureTls?: boolean } }>(
    '/oauth/password',
    async (request, reply) => {
      const { configId, username, password, insecureTls } = request.body;
      if (!configId || !username || !password) {
        return reply.code(400).send({ error: 'Missing required fields: configId, username, password' });
      }

      try {
        const result = await oauthService.passwordFlow({ configId, username, password, insecureTls });
        return reply.code(200).send(result);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          return reply.code(error.response?.status || 500).send({
            error: 'Password flow failed',
            details: error.response?.data || error.message,
          });
        }
        throw error;
      }
    },
  );
  server.post<{
    Body: {
      configId: string;
      accessToken: string;
      tokenType?: string;
      expiresIn?: number;
      scope?: string;
      idToken?: string;
    };
  }>('/oauth/implicit-tokens', async (request, reply) => {
    const { configId, accessToken } = request.body;
    if (!configId || !accessToken) {
      return reply.code(400).send({ error: 'Missing required fields: configId, accessToken' });
    }
    oauthService.storeImplicitTokens(request.body);
    return reply.code(204).send();
  });
};

export default oauthController;
