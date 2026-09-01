import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { registerEmptyBodyParser } from '../../utils/empty-body-parser';

async function startServer(registerParser: boolean) {
  const server = Fastify();
  if (registerParser) {
    registerEmptyBodyParser(server);
  }
  server.post('/action', async () => ({ success: true }));
  server.post('/echo', async (request) => ({ body: request.body ?? null }));

  await server.listen({ port: 0, host: '127.0.0.1' });
  return server;
}

describe('registerEmptyBodyParser', () => {
  let withParser: Awaited<ReturnType<typeof startServer>>;
  let withoutParser: Awaited<ReturnType<typeof startServer>>;

  beforeAll(async () => {
    withParser = await startServer(true);
    withoutParser = await startServer(false);
  });

  afterAll(async () => {
    await withParser.close();
    await withoutParser.close();
  });

  it('accepts POST with an empty body and no Content-Type (Content-Length: 0)', async () => {
    const res = await withParser.inject({
      method: 'POST',
      url: '/action',
      headers: { 'content-length': '0' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('accepts POST with an empty urlencoded body — what axios sends by default', async () => {
    const res = await withParser.inject({
      method: 'POST',
      url: '/action',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'content-length': '0' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('still parses JSON bodies through the built-in parser', async () => {
    const res = await withParser.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ a: 1 }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ body: { a: 1 } });
  });

  it('still parses text/plain through the built-in parser', async () => {
    const res = await withParser.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'text/plain' },
      payload: 'hello',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ body: 'hello' });
  });

  it('rejects non-empty payloads of unknown content types', async () => {
    const res = await withParser.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/octet-stream' },
      payload: Buffer.from([1, 2, 3]),
    });
    expect(res.statusCode).toBe(413);
  });

  it('without the parser, Fastify rejects empty urlencoded POSTs with 415', async () => {
    const res = await withoutParser.inject({
      method: 'POST',
      url: '/action',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'content-length': '0' },
    });
    expect(res.statusCode).toBe(415);
  });
});
