import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import axios, { AxiosRequestConfig } from 'axios';
import { ProxyRequest, ProxyResponse } from '../types';
import { saveRequest, getHistory, clearHistory } from '../database/storage';
import { getActiveEnvironment, substituteInRequest } from '../database/environments';
import { applyAuthentication, getAxiosAuthConfig } from '../helpers/authHelpers';

export async function proxyRoutes(server: FastifyInstance) {
  server.post<{ Body: ProxyRequest }>(
    '/proxy/request',
    async (request: FastifyRequest<{ Body: ProxyRequest }>, reply: FastifyReply) => {
      const { method, url, headers, body, auth } = request.body;

      // Validation
      if (!method || !url) {
        return reply.code(400).send({
          error: 'Missing required fields: method and url',
        });
      }

      // Get active environment and substitute variables
      const activeEnvironment = getActiveEnvironment();
      const substituted = substituteInRequest({ url, headers, body }, activeEnvironment);

      // Apply authentication
      const authenticated = applyAuthentication(auth, substituted.headers, substituted.url);

      const startTime = Date.now();

      try {
        const config: AxiosRequestConfig = {
          method: method.toLowerCase(),
          url: authenticated.url,
          headers: authenticated.headers || {},
          validateStatus: () => true, // Don't throw on any status code
        };

        // Add digest auth if needed
        const axiosAuth = getAxiosAuthConfig(auth);
        if (axiosAuth) {
          config.auth = axiosAuth;
        }

        // Add body for methods that support it
        if (['post', 'put', 'patch'].includes(method.toLowerCase()) && substituted.body) {
          config.data = substituted.body;
        }

        const response = await axios(config);
        const duration = Date.now() - startTime;

        const proxyResponse: ProxyResponse = {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers as Record<string, string>,
          body: typeof response.data === 'string' 
            ? response.data 
            : JSON.stringify(response.data),
          duration,
        };

        // Save to history
        saveRequest({
          method,
          url,
          headers,
          body,
          status: response.status,
          statusText: response.statusText,
          duration,
        });

        return reply.code(200).send(proxyResponse);
      } catch (error) {
        const duration = Date.now() - startTime;
        
        if (axios.isAxiosError(error)) {
          return reply.code(200).send({
            status: 0,
            statusText: 'Network Error',
            headers: {},
            body: JSON.stringify({ 
              error: error.message,
              code: error.code,
            }),
            duration,
          });
        }

        return reply.code(500).send({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Get request history
  server.get('/history', async (request: FastifyRequest, reply: FastifyReply) => {
    const history = getHistory();
    return reply.code(200).send(history);
  });

  // Clear request history
  server.delete('/history', async (request: FastifyRequest, reply: FastifyReply) => {
    clearHistory();
    return reply.code(200).send({ message: 'History cleared' });
  });
}