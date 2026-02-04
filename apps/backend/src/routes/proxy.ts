import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import axios, { AxiosRequestConfig } from 'axios';
import fetch from 'node-fetch';
import { ProxyRequest, ProxyResponse } from '../types';
import { saveRequest, getHistory, clearHistory } from '../database/storage';
import { getActiveEnvironment, substituteInRequest } from '../database/environments';
import { applyAuthentication, getAxiosAuthConfig } from '../helpers/authHelpers';

// Helper to validate URLs
function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

// Helper to check if method supports body
function methodSupportsBody(method: string): boolean {
  return ['post', 'put', 'patch'].includes(method.toLowerCase());
}

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

      // Validate URL format
      if (!isValidUrl(url)) {
        return reply.code(400).send({
          error: 'Invalid URL format',
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
        if (methodSupportsBody(method) && substituted.body) {
          config.data = substituted.body;
        }

        // Set reasonable timeout (30 seconds)
        config.timeout = 30000;

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
          const errorBody = {
            error: error.message,
            code: error.code,
            ...(error.response?.data && { responseData: error.response.data }),
          };

          return reply.code(200).send({
            status: error.response?.status || 0,
            statusText: error.response?.statusText || 'Network Error',
            headers: error.response?.headers || {},
            body: JSON.stringify(errorBody),
            duration,
          });
        }

        server.log.error({ error }, 'Proxy error');
        return reply.code(500).send({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Streaming proxy for SSE and other streaming responses
  server.post<{ Body: ProxyRequest }>(
    '/proxy/stream',
    {
      // Disable automatic serialization for raw streaming
      schema: {
        response: {
          200: {
            type: 'string'
          }
        }
      }
    },
    async (request: FastifyRequest<{ Body: ProxyRequest }>, reply: FastifyReply) => {
      const { method, url, headers, body, auth } = request.body;

      // Validation
      if (!method || !url) {
        return reply.code(400).send({
          error: 'Missing required fields: method and url',
        });
      }

      // Validate URL format
      if (!isValidUrl(url)) {
        return reply.code(400).send({
          error: 'Invalid URL format',
        });
      }

      // Get active environment and substitute variables
      const activeEnvironment = getActiveEnvironment();
      const substituted = substituteInRequest({ url, headers, body }, activeEnvironment);

      // Apply authentication
      const authenticated = applyAuthentication(auth, substituted.headers, substituted.url);

      try {
        const fetchOptions: any = {
          method: method.toUpperCase(),
          headers: authenticated.headers || {},
        };

        // Add body for methods that support it
        if (methodSupportsBody(method) && substituted.body) {
          fetchOptions.body = substituted.body;
        }

        // Make the streaming request
        const response = await fetch(authenticated.url, fetchOptions);

        // Disable automatic fastify handling
        reply.hijack();

        // Set response status and status message
        reply.raw.statusCode = response.status;
        reply.raw.statusMessage = response.statusText;
        
        // Copy response headers, but skip problematic ones
        response.headers.forEach((value: string, key: string) => {
          const lowerKey = key.toLowerCase();
          // Skip headers that conflict with streaming
          if (lowerKey !== 'content-length' && lowerKey !== 'connection') {
            reply.raw.setHeader(key, value);
          }
        });

        // Ensure we're using chunked encoding for streaming
        if (!response.headers.has('transfer-encoding')) {
          reply.raw.setHeader('Transfer-Encoding', 'chunked');
        }

        // Enable CORS
        reply.raw.setHeader('Access-Control-Allow-Origin', '*');

        // Write headers
        reply.raw.writeHead(response.status);

        // Pipe the response body directly to the client
        if (response.body) {
          response.body.pipe(reply.raw);
          
          // Handle errors during streaming
          response.body.on('error', (error) => {
            server.log.error(error);
            reply.raw.destroy();
          });
        } else {
          reply.raw.end();
        }

      } catch (error) {
        server.log.error({ error }, 'Streaming proxy error');
        if (!reply.raw.headersSent) {
          reply.code(500).send({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        } else {
          // If headers already sent, destroy the connection
          reply.raw.destroy();
        }
      }
    }
  );

  // Get request history
  server.get('/history', async (_request: FastifyRequest, reply: FastifyReply) => {
    const history = getHistory();
    return reply.code(200).send(history);
  });

  // Clear request history
  server.delete('/history', async (_request: FastifyRequest, reply: FastifyReply) => {
    clearHistory();
    return reply.code(200).send({ message: 'History cleared' });
  });
}