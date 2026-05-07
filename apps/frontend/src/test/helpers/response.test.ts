import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatResponseBody,
  getStatusBadgeColor,
  formatBytes,
  getHeaderCI,
  parseContentDispositionFilename,
  extensionForContentType,
  getDownloadFilename,
  decodeResponseBodyToBlob,
  downloadResponseBody,
} from '../../helpers/response';
import type { ProxyResponse } from '../../store/request/types';

describe('formatResponseBody', () => {
  it('formats JSON strings with indentation', () => {
    expect(formatResponseBody('{"a":1}')).toBe('{\n  "a": 1\n}');
  });

  it('returns original if already formatted', () => {
    const formatted = '{\n  "a": 1\n}';
    expect(formatResponseBody(formatted)).toBe(formatted);
  });

  it('returns raw text for non-JSON content', () => {
    expect(formatResponseBody('<html></html>')).toBe('<html></html>');
  });
});

describe('getStatusBadgeColor', () => {
  it('returns green for 2xx', () => {
    expect(getStatusBadgeColor(200)).toContain('green');
  });

  it('returns blue for 3xx', () => {
    expect(getStatusBadgeColor(301)).toContain('blue');
  });

  it('returns orange for 4xx', () => {
    expect(getStatusBadgeColor(404)).toContain('orange');
  });

  it('returns red for 5xx', () => {
    expect(getStatusBadgeColor(500)).toContain('red');
  });

  it('returns red for 0 (connection error)', () => {
    expect(getStatusBadgeColor(0)).toContain('red');
  });
});

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
  });

  it('formats with decimals', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });
});

describe('getHeaderCI', () => {
  it('finds headers regardless of case', () => {
    const headers = { 'Content-Type': 'application/json', 'X-Foo': 'bar' };
    expect(getHeaderCI(headers, 'content-type')).toBe('application/json');
    expect(getHeaderCI(headers, 'CONTENT-TYPE')).toBe('application/json');
    expect(getHeaderCI(headers, 'x-foo')).toBe('bar');
  });

  it('returns undefined for missing or empty inputs', () => {
    expect(getHeaderCI({}, 'content-type')).toBeUndefined();
    expect(getHeaderCI(undefined, 'content-type')).toBeUndefined();
  });
});

describe('parseContentDispositionFilename', () => {
  it('extracts quoted filename', () => {
    expect(parseContentDispositionFilename('attachment; filename="report.pdf"')).toBe('report.pdf');
  });

  it('extracts unquoted filename', () => {
    expect(parseContentDispositionFilename('attachment; filename=report.pdf')).toBe('report.pdf');
  });

  it('decodes RFC 5987 UTF-8 filename* and prefers it over plain filename', () => {
    const value = "attachment; filename=\"naive.pdf\"; filename*=UTF-8''na%C3%AFve.pdf";
    expect(parseContentDispositionFilename(value)).toBe('naïve.pdf');
  });

  it('handles non-UTF-8 charset by passing through encoded bytes', () => {
    expect(parseContentDispositionFilename("attachment; filename*=ISO-8859-1''caf%E9.txt")).toBe('caf%E9.txt');
  });

  it('falls back to plain filename when filename* is malformed', () => {
    const value = "attachment; filename=\"good.pdf\"; filename*=UTF-8''%C3%28";
    expect(parseContentDispositionFilename(value)).toBe('good.pdf');
  });

  it('strips path separators (defense in depth)', () => {
    expect(parseContentDispositionFilename('attachment; filename="../../etc/passwd"')).toBe('.._.._etc_passwd');
    expect(parseContentDispositionFilename('attachment; filename="C:\\evil\\x.exe"')).toBe('C:_evil_x.exe');
  });

  it('returns null when missing', () => {
    expect(parseContentDispositionFilename(undefined)).toBeNull();
    expect(parseContentDispositionFilename('attachment')).toBeNull();
    expect(parseContentDispositionFilename('inline; filename=""')).toBeNull();
  });
});

describe('extensionForContentType', () => {
  it.each([
    ['application/pdf', 'pdf'],
    ['application/json', 'json'],
    ['application/json; charset=utf-8', 'json'],
    ['application/ld+json', 'json'],
    ['application/vnd.api+json', 'json'],
    ['application/atom+xml', 'xml'],
    ['application/octet-stream', 'bin'],
    ['text/plain', 'txt'],
    ['text/html; charset=UTF-8', 'html'],
    ['text/csv', 'csv'],
    ['image/png', 'png'],
    ['image/jpeg', 'jpg'],
    ['image/svg+xml', 'svg'],
    ['video/mp4', 'mp4'],
    ['unknown/thing', 'bin'],
    ['text/something-new', 'txt'],
    [undefined, 'bin'],
    ['', 'bin'],
  ])('maps %s to %s', (ct, expected) => {
    expect(extensionForContentType(ct as string | undefined)).toBe(expected);
  });
});

const baseResponse = (overrides: Partial<ProxyResponse> = {}): ProxyResponse => ({
  status: 200,
  statusText: 'OK',
  headers: {},
  body: '',
  bodyEncoding: 'utf8',
  duration: 1,
  ...overrides,
});

describe('getDownloadFilename', () => {
  it('uses content-disposition filename when available', () => {
    const response = baseResponse({
      headers: { 'Content-Disposition': 'attachment; filename="invoice-42.pdf"' },
    });
    expect(getDownloadFilename(response)).toBe('invoice-42.pdf');
  });

  it('falls back to timestamped filename with content-type extension', () => {
    const response = baseResponse({
      headers: { 'content-type': 'application/json' },
    });
    const fixedNow = new Date(Date.UTC(2026, 4, 7, 10, 30, 45));
    // Avoid timezone flakiness by checking pattern + extension only
    const result = getDownloadFilename(response, undefined, fixedNow);
    expect(result).toMatch(/^response-\d{8}-\d{6}\.json$/);
  });

  it('uses .bin when content-type is missing', () => {
    const response = baseResponse({ headers: {} });
    expect(getDownloadFilename(response)).toMatch(/^response-\d{8}-\d{6}\.bin$/);
  });
});

describe('decodeResponseBodyToBlob', () => {
  it('returns text blob for utf8 bodies with the correct mime type', async () => {
    const response = baseResponse({
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: '{"hello":"world"}',
      bodyEncoding: 'utf8',
    });
    const blob = decodeResponseBodyToBlob(response);
    expect(blob.type).toBe('application/json');
    expect(await blob.text()).toBe('{"hello":"world"}');
  });

  it('returns octet-stream when content-type is missing', () => {
    const response = baseResponse({ body: 'hi' });
    const blob = decodeResponseBodyToBlob(response);
    expect(blob.type).toBe('application/octet-stream');
  });

  it('round-trips base64 bodies to identical bytes', async () => {
    const original = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00, 0xff, 0x80, 0x7f, 0x1a]);
    let binary = '';
    for (const b of original) binary += String.fromCharCode(b);
    const base64 = btoa(binary);

    const response = baseResponse({
      headers: { 'Content-Type': 'application/pdf' },
      body: base64,
      bodyEncoding: 'base64',
    });
    const blob = decodeResponseBodyToBlob(response);
    expect(blob.type).toBe('application/pdf');
    const buf = await blob.arrayBuffer();
    expect(new Uint8Array(buf)).toEqual(original);
  });
});

describe('downloadResponseBody', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let anchorClick: ReturnType<typeof vi.fn>;
  let originalCreate: typeof URL.createObjectURL;
  let originalRevoke: typeof URL.revokeObjectURL;
  let originalAnchorClick: typeof HTMLAnchorElement.prototype.click;

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:mock-url');
    revokeObjectURL = vi.fn();
    anchorClick = vi.fn();
    originalCreate = URL.createObjectURL;
    originalRevoke = URL.revokeObjectURL;
    originalAnchorClick = HTMLAnchorElement.prototype.click;
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;
    HTMLAnchorElement.prototype.click = anchorClick as unknown as typeof HTMLAnchorElement.prototype.click;
  });

  afterEach(() => {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    HTMLAnchorElement.prototype.click = originalAnchorClick;
  });

  it('creates an anchor with the derived filename and clicks it once', () => {
    const response = baseResponse({
      headers: { 'Content-Disposition': 'attachment; filename="report.csv"', 'Content-Type': 'text/csv' },
      body: 'a,b\n1,2',
    });

    let capturedAnchor: HTMLAnchorElement | undefined;
    const originalAppend = document.body.appendChild.bind(document.body);
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(<T extends Node>(node: T) => {
      if (node instanceof HTMLAnchorElement) capturedAnchor = node;
      return originalAppend(node) as T;
    });

    downloadResponseBody(response);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(capturedAnchor?.download).toBe('report.csv');
    expect(capturedAnchor?.href).toContain('blob:mock-url');
    expect(capturedAnchor?.parentNode).toBeNull(); // removed after click

    appendSpy.mockRestore();
  });

  it('uses a timestamped fallback filename when no content-disposition is set', () => {
    const response = baseResponse({
      headers: { 'Content-Type': 'application/pdf' },
      body: btoa('%PDF-1.4\n'),
      bodyEncoding: 'base64',
    });

    let capturedAnchor: HTMLAnchorElement | undefined;
    const originalAppend = document.body.appendChild.bind(document.body);
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(<T extends Node>(node: T) => {
      if (node instanceof HTMLAnchorElement) capturedAnchor = node;
      return originalAppend(node) as T;
    });

    downloadResponseBody(response);

    expect(capturedAnchor?.download).toMatch(/^response-\d{8}-\d{6}\.pdf$/);
    appendSpy.mockRestore();
  });
});
