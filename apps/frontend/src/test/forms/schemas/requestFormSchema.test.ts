import { describe, it, expect } from 'vitest';
import { requestFormSchema } from '../../../forms/schemas/requestFormSchema';

describe('requestFormSchema', () => {
  const validData = {
    method: 'GET',
    url: 'https://api.example.com/users',
    headers: [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }],
    params: [{ id: '1', key: 'page', value: '1', enabled: true }],
    body: '{}',
    auth: {
      type: 'none' as const,
    },
  };

  it('accepts valid request data', () => {
    const result = requestFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects empty URL', () => {
    const result = requestFormSchema.safeParse({ ...validData, url: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('URL is required');
    }
  });

  it('accepts all auth types', () => {
    const authTypes = ['none', 'basic', 'bearer', 'api-key', 'digest', 'oauth'] as const;
    for (const type of authTypes) {
      const result = requestFormSchema.safeParse({
        ...validData,
        auth: { type },
      });
      expect(result.success).toBe(true);
    }
  });

  it('accepts auth with basic credentials', () => {
    const result = requestFormSchema.safeParse({
      ...validData,
      auth: {
        type: 'basic',
        basic: { username: 'user', password: 'pass' },
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts auth with bearer token', () => {
    const result = requestFormSchema.safeParse({
      ...validData,
      auth: {
        type: 'bearer',
        bearer: { token: 'my-token' },
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts auth with API key', () => {
    const result = requestFormSchema.safeParse({
      ...validData,
      auth: {
        type: 'api-key',
        apiKey: { key: 'X-Api-Key', value: 'secret', addTo: 'header' },
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty headers and params arrays', () => {
    const result = requestFormSchema.safeParse({
      ...validData,
      headers: [],
      params: [],
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional savedRequestId', () => {
    const result = requestFormSchema.safeParse({
      ...validData,
      savedRequestId: 'req-123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.savedRequestId).toBe('req-123');
    }
  });

  it('rejects invalid auth type', () => {
    const result = requestFormSchema.safeParse({
      ...validData,
      auth: { type: 'invalid' },
    });
    expect(result.success).toBe(false);
  });
});
