import { describe, it, expect } from 'vitest';
import { oauthConfigSchema } from '../../../forms/schemas/oauthSchema';

describe('oauthConfigSchema', () => {
  const validConfig = {
    name: 'Test Config',
    provider: 'custom',
    authorizationUrl: 'https://auth.example.com/authorize',
    tokenUrl: 'https://auth.example.com/token',
    clientId: 'my-client-id',
    flowType: 'authorization-code-pkce' as const,
    usePKCE: true,
    scopes: 'openid profile',
    tokenStorage: 'session' as const,
    usePopup: true,
    autoRefreshToken: true,
    tokenRefreshThreshold: 300,
  };

  it('accepts valid config', () => {
    const result = oauthConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = oauthConfigSchema.safeParse({ ...validConfig, name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Configuration name is required');
    }
  });

  it('rejects invalid authorization URL', () => {
    const result = oauthConfigSchema.safeParse({ ...validConfig, authorizationUrl: 'not-a-url' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid authorization URL');
    }
  });

  it('rejects invalid token URL', () => {
    const result = oauthConfigSchema.safeParse({ ...validConfig, tokenUrl: 'not-a-url' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid token URL');
    }
  });

  it('rejects empty clientId', () => {
    const result = oauthConfigSchema.safeParse({ ...validConfig, clientId: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Client ID is required');
    }
  });

  it('accepts all flow types', () => {
    const flowTypes = [
      'authorization-code',
      'authorization-code-pkce',
      'implicit',
      'client-credentials',
      'password',
    ] as const;
    for (const flowType of flowTypes) {
      const result = oauthConfigSchema.safeParse({ ...validConfig, flowType });
      expect(result.success).toBe(true);
    }
  });

  it('accepts optional revocationUrl', () => {
    const result = oauthConfigSchema.safeParse({
      ...validConfig,
      revocationUrl: 'https://auth.example.com/revoke',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty string for revocationUrl', () => {
    const result = oauthConfigSchema.safeParse({
      ...validConfig,
      revocationUrl: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid revocationUrl', () => {
    const result = oauthConfigSchema.safeParse({
      ...validConfig,
      revocationUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('rejects tokenRefreshThreshold below 60', () => {
    const result = oauthConfigSchema.safeParse({
      ...validConfig,
      tokenRefreshThreshold: 30,
    });
    expect(result.success).toBe(false);
  });

  it('rejects tokenRefreshThreshold above 3600', () => {
    const result = oauthConfigSchema.safeParse({
      ...validConfig,
      tokenRefreshThreshold: 5000,
    });
    expect(result.success).toBe(false);
  });

  it('accepts all token storage types', () => {
    const storageTypes = ['memory', 'session', 'local'] as const;
    for (const tokenStorage of storageTypes) {
      const result = oauthConfigSchema.safeParse({ ...validConfig, tokenStorage });
      expect(result.success).toBe(true);
    }
  });

  it('accepts optional clientSecret', () => {
    const result = oauthConfigSchema.safeParse({
      ...validConfig,
      clientSecret: 'my-secret',
    });
    expect(result.success).toBe(true);
  });

  it('trims name whitespace', () => {
    const result = oauthConfigSchema.safeParse({
      ...validConfig,
      name: '  Test Config  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Test Config');
    }
  });
});
