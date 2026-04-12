import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import axios, { AxiosRequestConfig } from 'axios';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { ProxyRequest, ProxyResponse, FormDataEntry } from '../types';
import { saveRequest, getHistory, clearHistory } from '../database/storage';
import { getActiveEnvironment, substituteInRequest } from '../database/environments';
import { applyAuthentication, getAxiosAuthConfig } from '../helpers/authHelpers';

function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

function methodSupportsBody(method: string): boolean {
  return ['post', 'put', 'patch'].includes(method.toLowerCase());
}

function buildFormDataBody(entries: FormDataEntry[]): FormData {
  const form = new FormData();
  for (const entry of entries) {
    if (entry.type === 'file' && entry.fileContent) {
      // fileContent is a data URL: "data:<mime>;base64,<data>"
      const match = entry.fileContent.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const buffer = Buffer.from(match[2], 'base64');
        form.append(entry.key, buffer, { filename: entry.fileName || 'file', contentType: match[1] });
      }
    } else {
      form.append(entry.key, entry.value);
    }
  }
  return form;
}

function buildUrlEncodedBody(entries: FormDataEntry[]): string {
  const params = new URLSearchParams();
  for (const entry of entries) {
    params.append(entry.key, entry.value);
  }
  return params.toString();
}

export async function proxyRoutes(server: FastifyInstance) {
  server.post<{ Body: ProxyRequest }>(
    '/proxy/request',
    async (request: FastifyRequest<{ Body: ProxyRequest }>, reply: FastifyReply) => {
      const { method, url, headers, body, bodyType, formDataEntries, auth } = request.body;

      if (!method || !url) {
        return reply.code(400).send({ error: 'Missing required fields: method and url' });
      }

      if (!isValidUrl(url)) {
        return reply.code(400).send({ error: 'Invalid URL format' });
      }

      const activeEnvironment = getActiveEnvironment();
      const substituted = substituteInRequest({ url, headers, body, formDataEntries }, activeEnvironment);
      const authenticated = applyAuthentication(auth, substituted.headers, substituted.url);

      const startTime = Date.now();

      try {
        const config: AxiosRequestConfig = {
          method: method.toLowerCase(),
          url: authenticated.url,
          headers: authenticated.headers || {},
          validateStatus: () => true,
          timeout: 30000,
        };

        const axiosAuth = getAxiosAuthConfig(auth);
        if (axiosAuth) {
          config.auth = axiosAuth;
        }

        if (methodSupportsBody(method)) {
          if (bodyType === 'form-data' && substituted.formDataEntries?.length) {
            const form = buildFormDataBody(substituted.formDataEntries);
            config.data = form;
            config.headers = { ...config.headers, ...form.getHeaders() };
          } else if (bodyType === 'x-www-form-urlencoded' && substituted.formDataEntries?.length) {
            config.data = buildUrlEncodedBody(substituted.formDataEntries);
            config.headers = { ...config.headers, 'Content-Type': 'application/x-www-form-urlencoded' };
          } else if (substituted.body) {
            config.data = substituted.body;
          }
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

        saveRequest({
          method,
          url,
          headers,
          body,
          bodyType,
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

  server.post<{ Body: ProxyRequest }>(
    '/proxy/stream',
    {
      schema: {
        response: {
          200: { type: 'string' }
        }
      }
    },
    async (request: FastifyRequest<{ Body: ProxyRequest }>, reply: FastifyReply) => {
      const { method, url, headers, body, bodyType, formDataEntries, auth } = request.body;

      if (!method || !url) {
        return reply.code(400).send({ error: 'Missing required fields: method and url' });
      }

      if (!isValidUrl(url)) {
        return reply.code(400).send({ error: 'Invalid URL format' });
      }

      const activeEnvironment = getActiveEnvironment();
      const substituted = substituteInRequest({ url, headers, body, formDataEntries }, activeEnvironment);
      const authenticated = applyAuthentication(auth, substituted.headers, substituted.url);

      try {
        const fetchHeaders: Record<string, string> = { ...(authenticated.headers || {}) };
        let fetchBody: string | Buffer | undefined;

        if (methodSupportsBody(method)) {
          if (bodyType === 'form-data' && substituted.formDataEntries?.length) {
            const form = buildFormDataBody(substituted.formDataEntries);
            fetchBody = form.getBuffer();
            Object.assign(fetchHeaders, form.getHeaders());
          } else if (bodyType === 'x-www-form-urlencoded' && substituted.formDataEntries?.length) {
            fetchBody = buildUrlEncodedBody(substituted.formDataEntries);
            fetchHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
          } else if (substituted.body) {
            fetchBody = substituted.body;
          }
        }

        const fetchOptions: any = {
          method: method.toUpperCase(),
          headers: fetchHeaders,
          ...(fetchBody !== undefined && { body: fetchBody }),
        };

        const response = await fetch(authenticated.url, fetchOptions);

        // EXPLAIN: Hijack disables Fastify serialization for raw streaming control
        reply.hijack();

        reply.raw.statusCode = response.status;
        reply.raw.statusMessage = response.statusText;
        
        // GOTCHA: Skip content-length and connection headers to avoid streaming conflicts
        response.headers.forEach((value: string, key: string) => {
          const lowerKey = key.toLowerCase();
          if (lowerKey !== 'content-length' && lowerKey !== 'connection') {
            reply.raw.setHeader(key, value);
          }
        });

        if (!response.headers.has('transfer-encoding')) {
          reply.raw.setHeader('Transfer-Encoding', 'chunked');
        }

        reply.raw.setHeader('Access-Control-Allow-Origin', '*');
        reply.raw.writeHead(response.status);

        if (response.body) {
          response.body.pipe(reply.raw);
          
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
          reply.raw.destroy();
        }
      }
    }
  );

  server.get('/history', async (_request: FastifyRequest, reply: FastifyReply) => {
    const history = getHistory();
    return reply.code(200).send(history);
  });

  server.delete('/history', async (_request: FastifyRequest, reply: FastifyReply) => {
    clearHistory();
    return reply.code(200).send({ message: 'History cleared' });
  });
}