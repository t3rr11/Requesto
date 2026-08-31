import type { FastifyInstance } from 'fastify';

/**
 * Accept POST/PUT/PATCH requests that carry no payload and no Content-Type
 * header (e.g. an API client invoking an endpoint like
 * `POST /collections/:id/duplicate` with an empty body).
 *
 * Fastify's default behaviour rejects these with
 * `415 Unsupported Media Type`, which makes the API awkward to use from
 * any client that doesn't send a placeholder `{}` body.
 *
 * The catch-all parser only handles content types that would otherwise be
 * rejected — built-in JSON/text parsing keeps precedence. Empty payloads
 * parse to `undefined` so routes can treat them as "no body"; non-empty
 * payloads of unknown content types are rejected with 413 via `bodyLimit`.
 */
export function registerEmptyBodyParser(server: FastifyInstance): void {
  server.addContentTypeParser('*', { parseAs: 'string', bodyLimit: 1 }, (_request, _body, done) => {
    done(null, undefined);
  });
}
