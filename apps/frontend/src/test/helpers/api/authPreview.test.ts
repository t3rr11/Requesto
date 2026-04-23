import { describe, it, expect } from 'vitest';
import { applyAuthForDisplay } from '../../../helpers/api/authPreview';
import type { ProxyRequest } from '../../../store/request/types';

const baseReq: ProxyRequest = {
  method: 'GET',
  url: 'https://api.example.com/path',
  headers: { 'X-Existing': 'yes' },
};

describe('applyAuthForDisplay', () => {
  it('returns request unchanged for type none', () => {
    const result = applyAuthForDisplay({ ...baseReq, auth: { type: 'none' } });
    expect(result.headers).toEqual({ 'X-Existing': 'yes' });
    expect(result.url).toBe(baseReq.url);
  });

  it('adds basic auth Authorization header (base64-encoded)', () => {
    const result = applyAuthForDisplay({
      ...baseReq,
      auth: { type: 'basic', basic: { username: 'alice', password: 'p4ss' } },
    });
    expect(result.headers?.['Authorization']).toBe(`Basic ${btoa('alice:p4ss')}`);
  });

  it('adds bearer token Authorization header', () => {
    const result = applyAuthForDisplay({
      ...baseReq,
      auth: { type: 'bearer', bearer: { token: 'sekret' } },
    });
    expect(result.headers?.['Authorization']).toBe('Bearer sekret');
  });

  it('adds api-key header when addTo=header', () => {
    const result = applyAuthForDisplay({
      ...baseReq,
      auth: { type: 'api-key', apiKey: { key: 'X-Api-Key', value: 'abc', addTo: 'header' } },
    });
    expect(result.headers?.['X-Api-Key']).toBe('abc');
    expect(result.url).toBe(baseReq.url);
  });

  it('appends api-key to URL when addTo=query', () => {
    const result = applyAuthForDisplay({
      ...baseReq,
      auth: { type: 'api-key', apiKey: { key: 'token', value: 'abc', addTo: 'query' } },
    });
    expect(result.url).toBe('https://api.example.com/path?token=abc');
    expect(result.headers?.['Authorization']).toBeUndefined();
  });

  it('shows digest username preview', () => {
    const result = applyAuthForDisplay({
      ...baseReq,
      auth: { type: 'digest', digest: { username: 'alice', password: 'p4ss' } },
    });
    expect(result.headers?.['Authorization']).toBe('Digest username="alice"');
  });

  it('preserves existing headers', () => {
    const result = applyAuthForDisplay({
      ...baseReq,
      auth: { type: 'bearer', bearer: { token: 'tk' } },
    });
    expect(result.headers?.['X-Existing']).toBe('yes');
  });
});
