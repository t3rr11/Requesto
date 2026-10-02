import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { MockContentType, MockHttpMethod } from '../models/mock';
import { matchEndpoint, getConfiguredMethods } from './path-matcher';
import { handleDynamicRequest } from './crud-handler';
import { MockEndpointRepository } from '../repositories/mock-endpoint.repository';

const CONTENT_TYPE_HEADER: Record<MockContentType, string> = {
  json: 'application/json; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
  html: 'text/html; charset=utf-8',
  text: 'text/plain; charset=utf-8',
};

export interface MockHitInfo {
  method: string;
  path: string;
  status: number;
  endpointName: string | null;
  durationMs: number;
  responseBody: string;
  responseHeaders: Record<string, string>;
}

export interface MockAppOptions {
  endpointRepository: MockEndpointRepository;
  onHit: (hit: MockHitInfo) => void;
}

/**
 * Build the standalone Fastify instance that serves mock endpoints.
 *
 * A single catch-all handler resolves routes per request instead of
 * registering one route per endpoint, because endpoint definitions are
 * user-editable at runtime and must take effect immediately without a restart.
 */
export async function buildMockApp(options: MockAppOptions): Promise<FastifyInstance> {
  const server = Fastify({
    logger: { level: 'error' },
  });

  // Mock responses are consumed by arbitrary local UI apps, so any origin is allowed
  await server.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  });

  // The not-found handler doubles as the mock resolver: every request that no
  // registered route claims ends up here, and CORS preflight (OPTIONS) is
  // handled earlier by the cors plugin itself.
  server.setNotFoundHandler(async (request, reply) => {
    const startedAt = Date.now();
    const pathname = request.url.split('?')[0] || '/';
    const method = request.method.toUpperCase();
    const isConfiguredMethod = (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as string[]).includes(method);

    let status = 404;
    let endpointName: string | null = null;
    let responseBody = '';
    let responseHeaders: Record<string, string> = {};

    try {
      const endpoints = options.endpointRepository.getAll();
      // Unknown verbs still match the path so unconfigured methods get a 405 (with Allow)
      const match = matchEndpoint(endpoints, pathname);

      if (match) {
        endpointName = match.endpoint.name;
        const endpoint = match.endpoint;

        if (endpoint.mode === 'dynamic') {
          if (!isConfiguredMethod) {
            status = 405;
            const allow = getConfiguredMethods(endpoint).join(', ');
            reply.header('Allow', allow);
            responseBody = JSON.stringify({ error: `Method ${method} is not supported on this endpoint` });
            responseHeaders = { 'content-type': 'application/json', allow };
            reply.code(status).send(responseBody);
          } else {
            const dataset = options.endpointRepository.readDataset(endpoint.id);
            const result = handleDynamicRequest(
              {
                method: method as MockHttpMethod,
                params: match.params,
                body: request.body,
                query: (request.query ?? {}) as Record<string, unknown>,
              },
              dataset,
              (records) => options.endpointRepository.writeDataset(endpoint.id, records),
            );
            status = result.status;
            responseBody = JSON.stringify(result.body);
            responseHeaders = { 'content-type': 'application/json' };
            reply.code(status).send(result.body);
          }
        } else {
          const staticResponse = endpoint.methods[method as MockHttpMethod];
          if (!staticResponse) {
            // Correct HTTP semantics: the resource exists but not for this verb
            status = 405;
            const allow = getConfiguredMethods(endpoint).join(', ');
            reply.header('Allow', allow);
            responseBody = JSON.stringify({ error: `Method ${method} is not configured on this endpoint` });
            responseHeaders = { 'content-type': 'application/json', allow };
            reply.code(status).send(responseBody);
          } else {
            if (staticResponse.delayMs > 0) {
              await new Promise((resolve) => setTimeout(resolve, staticResponse.delayMs));
            }
            status = staticResponse.status;
            for (const [name, value] of Object.entries(staticResponse.headers)) {
              reply.header(name, value);
            }
            responseHeaders = { ...staticResponse.headers, 'content-type': CONTENT_TYPE_HEADER[staticResponse.contentType] };
            reply
              .code(status)
              .header('Content-Type', CONTENT_TYPE_HEADER[staticResponse.contentType])
              .send(staticResponse.body);
          }
        }
      } else {
        responseBody = JSON.stringify({ error: 'No mock endpoint matches this path' });
        responseHeaders = { 'content-type': 'application/json' };
        reply.code(status).send(responseBody);
      }
    } catch (error) {
      status = 500;
      server.log.error(error);
      reply.code(status).send({ error: 'Mock endpoint failed' });
    } finally {
      options.onHit({
        method,
        path: pathname,
        status,
        endpointName,
        durationMs: Date.now() - startedAt,
        responseBody,
        responseHeaders,
      });
    }
  });

  return server;
}
