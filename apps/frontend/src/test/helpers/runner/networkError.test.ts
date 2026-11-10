import { describe, it, expect } from 'vitest';
import { networkErrorFromResponse } from '../../../helpers/runner/networkError';
import type { ProxyResponse } from '../../../store/request/types';

function responseOf(overrides: Partial<ProxyResponse>): ProxyResponse {
  return { status: 0, statusText: 'Network Error', headers: {}, body: '', bodyEncoding: 'utf8', duration: 0, ...overrides };
}

describe('networkErrorFromResponse', () => {
  it('returns null for real responses (any non-zero status)', () => {
    expect(networkErrorFromResponse(responseOf({ status: 200 }))).toBeNull();
    expect(networkErrorFromResponse(responseOf({ status: 404 }))).toBeNull();
    expect(networkErrorFromResponse(responseOf({ status: 500, statusText: 'Internal Server Error' }))).toBeNull();
  });

  it('surfaces the proxy controller\'s embedded axios error message', () => {
    const response = responseOf({
      body: JSON.stringify({ error: 'getaddrinfo ENOTFOUND example.test', code: 'ENOTFOUND' }),
    });
    const error = networkErrorFromResponse(response);
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('getaddrinfo ENOTFOUND example.test');
  });

  it('falls back to the statusText when the body is not JSON', () => {
    const error = networkErrorFromResponse(responseOf({ body: 'not json' }));
    expect(error?.message).toBe('Network Error');
  });

  it('falls back to statusText when the body JSON lacks an error field', () => {
    const error = networkErrorFromResponse(responseOf({ body: JSON.stringify({ code: 'ECONNREFUSED' }) }));
    expect(error?.message).toBe('Network Error');
  });
});
