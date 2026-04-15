import { FastifyPluginAsync } from 'fastify';
import axios from 'axios';
import { OAuthService } from '../services/oauth.service';
import type { OAuthConfigServer } from '../models/oauth';

interface Options {
  oauthService: OAuthService;
}

const oauthController: FastifyPluginAsync<Options> = async (server, opts) => {
  const { oauthService } = opts;

  server.get('/oauth/configs', async () => {
    return oauthService.getAll();
  });

  server.get<{ Params: { id: string } }>('/oauth/configs/:id', async (request, _reply) => {
    return oauthService.getById(request.params.id);
  });

  server.post<{ Body: Omit<OAuthConfigServer, 'id' | 'createdAt' | 'updatedAt'> }>(
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

  server.patch<{ Params: { id: string }; Body: Partial<Omit<OAuthConfigServer, 'id' | 'createdAt'>> }>(
    '/oauth/configs/:id',
    async (request, _reply) => {
      return oauthService.update(request.params.id, request.body);
    },
  );

  server.delete<{ Params: { id: string } }>('/oauth/configs/:id', async (request, reply) => {
    oauthService.delete(request.params.id);
    return reply.code(204).send();
  });

  server.post<{ Body: { configId: string; code: string; codeVerifier?: string; redirectUri: string } }>(
    '/oauth/token',
    async (request, reply) => {
      const { configId, code, codeVerifier, redirectUri } = request.body;
      if (!configId || !code || !redirectUri) {
        return reply.code(400).send({ error: 'Missing required fields: configId, code, redirectUri' });
      }

      try {
        const result = await oauthService.exchangeToken({ configId, code, codeVerifier, redirectUri });
        return reply.code(200).send(result);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          return reply.code(error.response?.status || 500).send({
            error: 'Token exchange failed',
            details: error.response?.data || error.message,
          });
        }
        throw error;
      }
    },
  );

  server.post<{ Body: { configId: string; refreshToken: string } }>(
    '/oauth/refresh',
    async (request, reply) => {
      const { configId, refreshToken } = request.body;
      if (!configId || !refreshToken) {
        return reply.code(400).send({ error: 'Missing required fields: configId, refreshToken' });
      }

      try {
        const result = await oauthService.refreshToken({ configId, refreshToken });
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

  server.post<{ Body: { configId: string; token: string; tokenTypeHint?: string } }>(
    '/oauth/revoke',
    async (request, reply) => {
      const { configId, token, tokenTypeHint } = request.body;
      if (!configId || !token) {
        return reply.code(400).send({ error: 'Missing required fields: configId, token' });
      }

      try {
        const result = await oauthService.revokeToken({ configId, token, tokenTypeHint });
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

  server.post<{ Body: { configId: string } }>('/oauth/client-credentials', async (request, reply) => {
    const { configId } = request.body;
    if (!configId) {
      return reply.code(400).send({ error: 'Missing required field: configId' });
    }

    try {
      const result = await oauthService.clientCredentials(configId);
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

  server.post<{ Body: { configId: string; username: string; password: string } }>(
    '/oauth/password',
    async (request, reply) => {
      const { configId, username, password } = request.body;
      if (!configId || !username || !password) {
        return reply.code(400).send({ error: 'Missing required fields: configId, username, password' });
      }

      try {
        const result = await oauthService.passwordFlow({ configId, username, password });
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
};

export default oauthController;
