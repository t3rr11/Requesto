import http from 'node:http';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { AddressInfo } from 'node:net';
import { ProxyService } from '../../services/proxy.service';
import type { EnvironmentService } from '../../services/environment.service';
import type { HistoryService } from '../../services/history.service';
import {
  isTextContentType,
  parseCharset,
  encodeResponseBody,
} from '../../utils/responseEncoding';

interface TestServerHandle {
  url: string;
  close: () => Promise<void>;
}

interface RouteResponse {
  status?: number;
  contentType?: string | undefined;
  body: Buffer | string;
  extraHeaders?: Record<string, string>;
}

function startServer(routes: Record<string, RouteResponse>): Promise<TestServerHandle> {
  const server = http.createServer((req, res) => {
    const route = routes[req.url ?? ''];
    if (!route) {
      res.writeHead(404).end();
      return;
    }
    const headers: Record<string, string | number> = { ...(route.extraHeaders ?? {}) };
    if (route.contentType !== undefined) {
      headers['Content-Type'] = route.contentType;
    }
    const buf = Buffer.isBuffer(route.body) ? route.body : Buffer.from(route.body);
    headers['Content-Length'] = buf.length;
    res.writeHead(route.status ?? 200, headers);
    res.end(buf);
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise<void>((r) => {
            server.close(() => r());
          }),
      });
    });
  });
}

function makeProxyServiceDeps(): { environmentService: EnvironmentService; historyService: HistoryService } {
  const environmentService = {
    substituteInRequest: (req: { url: string; headers?: Record<string, string>; body?: string; formDataEntries?: unknown }) => req,
    substituteInAuth: (auth: unknown) => auth,
  } as unknown as EnvironmentService;
  const historyService = { save: vi.fn() } as unknown as HistoryService;
  return { environmentService, historyService };
}

describe('responseEncoding utils', () => {
  describe('isTextContentType', () => {
    it.each([
      ['text/plain', true],
      ['text/html; charset=utf-8', true],
      ['application/json', true],
      ['application/json; charset=utf-8', true],
      ['application/ld+json', true],
      ['application/xml', true],
      ['application/vnd.api+json', true],
      ['application/atom+xml', true],
      ['application/yaml', true],
      ['application/javascript', true],
      ['application/x-www-form-urlencoded', true],
      ['application/pdf', false],
      ['application/octet-stream', false],
      ['image/png', false],
      ['image/jpeg', false],
      ['video/mp4', false],
      ['audio/mpeg', false],
      [undefined, true],
      ['', true],
    ])('classifies %s as text=%s', (ct, expected) => {
      expect(isTextContentType(ct as string | undefined)).toBe(expected);
    });
  });

  describe('parseCharset', () => {
    it('returns utf-8 by default', () => {
      expect(parseCharset(undefined)).toBe('utf-8');
      expect(parseCharset('text/plain')).toBe('utf-8');
    });

    it('extracts charset parameter', () => {
      expect(parseCharset('text/plain; charset=iso-8859-1')).toBe('iso-8859-1');
      expect(parseCharset('text/html; charset="UTF-8"')).toBe('utf-8');
      expect(parseCharset('application/json;charset=ascii')).toBe('ascii');
    });
  });

  describe('encodeResponseBody', () => {
    it('returns empty utf8 for empty buffer regardless of content-type', () => {
      expect(encodeResponseBody(Buffer.alloc(0), 'application/pdf')).toEqual({
        body: '',
        bodyEncoding: 'utf8',
      });
    });

    it('decodes text content as utf-8 string', () => {
      const buf = Buffer.from('{"hello":"world"}', 'utf-8');
      expect(encodeResponseBody(buf, 'application/json')).toEqual({
        body: '{"hello":"world"}',
        bodyEncoding: 'utf8',
      });
    });

    it('decodes text using declared charset', () => {
      // "café" in latin1 is 4 bytes (non-utf8)
      const buf = Buffer.from([0x63, 0x61, 0x66, 0xe9]);
      const result = encodeResponseBody(buf, 'text/plain; charset=latin1');
      expect(result.bodyEncoding).toBe('utf8');
      expect(result.body).toBe('café');
    });

    it('falls back to utf-8 for unknown charset (does not throw)', () => {
      const buf = Buffer.from('hello', 'utf-8');
      const result = encodeResponseBody(buf, 'text/plain; charset=foo-bar-9000');
      expect(result.bodyEncoding).toBe('utf8');
      expect(result.body).toBe('hello');
    });

    it('base64-encodes binary content (PDF magic bytes round-trip)', () => {
      const pdfHeader = Buffer.from('%PDF-1.4\n', 'utf-8');
      const trailer = Buffer.from([0x00, 0xff, 0x80, 0x7f, 0x1a]);
      const original = Buffer.concat([pdfHeader, trailer]);
      const result = encodeResponseBody(original, 'application/pdf');
      expect(result.bodyEncoding).toBe('base64');
      const decoded = Buffer.from(result.body, 'base64');
      expect(decoded.equals(original)).toBe(true);
    });

    it('base64-encodes octet-stream', () => {
      const original = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
      const result = encodeResponseBody(original, 'application/octet-stream');
      expect(result.bodyEncoding).toBe('base64');
      expect(Buffer.from(result.body, 'base64').equals(original)).toBe(true);
    });
  });
});

describe('ProxyService.executeRequest body encoding', () => {
  let server: TestServerHandle;
  const pdfBytes = Buffer.concat([
    Buffer.from('%PDF-1.4\n', 'utf-8'),
    Buffer.from([0x00, 0xff, 0x80, 0x7f, 0x1a, 0x00, 0x25, 0x25, 0x45, 0x4f, 0x46]),
  ]);
  const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

  beforeAll(async () => {
    server = await startServer({
      '/json': {
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, value: 42 }),
      },
      '/pdf': {
        contentType: 'application/pdf',
        body: pdfBytes,
      },
      '/png': {
        contentType: 'image/png',
        body: pngBytes,
      },
      '/text-latin1': {
        contentType: 'text/plain; charset=latin1',
        body: Buffer.from([0x63, 0x61, 0x66, 0xe9]),
      },
      '/empty': {
        contentType: 'application/json',
        body: '',
      },
      '/no-ct': {
        contentType: undefined,
        body: '{"hello":"world"}',
      },
      '/with-disposition': {
        contentType: 'application/pdf',
        body: pdfBytes,
        extraHeaders: {
          'Content-Disposition': 'attachment; filename="report.pdf"',
        },
      },
    });
  });

  afterAll(async () => {
    await server.close();
  });

  it('returns JSON as utf8 with parseable body', async () => {
    const { environmentService, historyService } = makeProxyServiceDeps();
    const service = new ProxyService(environmentService, historyService);

    const result = await service.executeRequest({ method: 'GET', url: `${server.url}/json` });

    expect(result.status).toBe(200);
    expect(result.bodyEncoding).toBe('utf8');
    expect(JSON.parse(result.body)).toEqual({ ok: true, value: 42 });
  });

  it('returns PDF as base64 with byte-identical round-trip', async () => {
    const { environmentService, historyService } = makeProxyServiceDeps();
    const service = new ProxyService(environmentService, historyService);

    const result = await service.executeRequest({ method: 'GET', url: `${server.url}/pdf` });

    expect(result.status).toBe(200);
    expect(result.bodyEncoding).toBe('base64');
    const decoded = Buffer.from(result.body, 'base64');
    expect(decoded.equals(pdfBytes)).toBe(true);
  });

  it('returns PNG as base64 with byte-identical round-trip', async () => {
    const { environmentService, historyService } = makeProxyServiceDeps();
    const service = new ProxyService(environmentService, historyService);

    const result = await service.executeRequest({ method: 'GET', url: `${server.url}/png` });

    expect(result.bodyEncoding).toBe('base64');
    expect(Buffer.from(result.body, 'base64').equals(pngBytes)).toBe(true);
  });

  it('decodes text using declared latin1 charset', async () => {
    const { environmentService, historyService } = makeProxyServiceDeps();
    const service = new ProxyService(environmentService, historyService);

    const result = await service.executeRequest({ method: 'GET', url: `${server.url}/text-latin1` });

    expect(result.bodyEncoding).toBe('utf8');
    expect(result.body).toBe('café');
  });

  it('handles empty bodies', async () => {
    const { environmentService, historyService } = makeProxyServiceDeps();
    const service = new ProxyService(environmentService, historyService);

    const result = await service.executeRequest({ method: 'GET', url: `${server.url}/empty` });

    expect(result.body).toBe('');
    expect(result.bodyEncoding).toBe('utf8');
  });

  it('preserves content-disposition header for downstream filename derivation', async () => {
    const { environmentService, historyService } = makeProxyServiceDeps();
    const service = new ProxyService(environmentService, historyService);

    const result = await service.executeRequest({ method: 'GET', url: `${server.url}/with-disposition` });

    expect(result.bodyEncoding).toBe('base64');
    const dispositionKey = Object.keys(result.headers).find((k) => k.toLowerCase() === 'content-disposition');
    expect(dispositionKey).toBeDefined();
    expect(result.headers[dispositionKey!]).toContain('report.pdf');
  });
});
