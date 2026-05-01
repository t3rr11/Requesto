import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import axios from 'axios';
import { ProxyService } from '../services/proxy.service';
import { HistoryService } from '../services/history.service';
import { InteractiveAuthRequiredError } from '../services/oauth.service';
import type { ProxyRequest } from '../models/proxy';

interface Options {
  proxyService: ProxyService;
  historyService: HistoryService;
}

const proxyController: FastifyPluginAsync<Options> = async (server, opts) => {
  const { proxyService, historyService } = opts;

  server.post<{ Body: ProxyRequest }>(
    '/proxy/request',
    async (request: FastifyRequest<{ Body: ProxyRequest }>, reply: FastifyReply) => {
      const { method, url } = request.body;

      if (!method || !url) {
        return reply.code(400).send({ error: 'Missing required fields: method and url' });
      }

      try {
        const result = await proxyService.executeRequest(request.body);
        return reply.code(200).send(result);
      } catch (error) {
        if (error instanceof InteractiveAuthRequiredError) {
          return reply.code(401).send({
            error: error.message,
            code: 'OAUTH_INTERACTIVE_REQUIRED',
            configId: error.configId,
          });
        }
        if (axios.isAxiosError(error)) {
          const duration = 0;
          return reply.code(200).send({
            status: error.response?.status || 0,
            statusText: error.response?.statusText || 'Network Error',
            headers: error.response?.headers || {},
            body: JSON.stringify({
              error: error.message,
              code: error.code,
              ...(error.response?.data && { responseData: error.response.data }),
            }),
            duration,
          });
        }
        throw error;
      }
    },
  );

  server.post<{ Body: ProxyRequest }>(
    '/proxy/stream',
    {
      schema: {
        response: {
          200: { type: 'string' },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ProxyRequest }>, reply: FastifyReply) => {
      const { method, url } = request.body;

      if (!method || !url) {
        return reply.code(400).send({ error: 'Missing required fields: method and url' });
      }

      let streamResult: Awaited<ReturnType<typeof proxyService.streamRequest>>;
      try {
        streamResult = await proxyService.streamRequest(request.body);
      } catch (error) {
        if (error instanceof InteractiveAuthRequiredError) {
          return reply.code(401).send({
            error: error.message,
            code: 'OAUTH_INTERACTIVE_REQUIRED',
            configId: error.configId,
          });
        }
        throw error;
      }
      const { response } = streamResult;

      reply.hijack();
      reply.raw.statusCode = response.status;
      reply.raw.statusMessage = response.statusText;

      response.headers.forEach((value: string, key: string) => {
        const lowerKey = key.toLowerCase();
        if (lowerKey !== 'content-length' && lowerKey !== 'connection' && lowerKey !== 'content-encoding') {
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
    },
  );

  server.get('/history', async () => {
    return historyService.getHistory();
  });

  server.delete('/history', async () => {
    historyService.clear();
    return { message: 'History cleared' };
  });
};

export default proxyController;
