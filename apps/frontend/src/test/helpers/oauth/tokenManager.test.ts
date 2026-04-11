import { describe, it, expect, beforeEach } from 'vitest';
import {
  storeTokens,
  getTokens,
  removeTokens,
  hasTokens,
  isTokenExpired,
  isTokenExpiringSoon,
  getTimeUntilExpiry,
  formatTimeUntilExpiry,
  clearAllTokens,
  getBearerToken,
  generateAuthorizationHeader,
} from '../../../helpers/oauth/tokenManager';
import type { OAuthTokens } from '../../../store/oauth/types';

const CONFIG_ID = 'test-config';

const makeTokens = (overrides: Partial<OAuthTokens> = {}): OAuthTokens => ({
  accessToken: 'access-123',
  tokenType: 'Bearer',
  expiresIn: 3600,
  ...overrides,
});

describe('tokenManager', () => {
  beforeEach(() => {
    clearAllTokens();
  });

  describe('storeTokens / getTokens', () => {
    it('stores and retrieves tokens from session storage', () => {
      storeTokens(CONFIG_ID, makeTokens(), 'session');
      const retrieved = getTokens(CONFIG_ID);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.accessToken).toBe('access-123');
    });

    it('stores and retrieves from local storage', () => {
      storeTokens(CONFIG_ID, makeTokens(), 'local');
      const retrieved = getTokens(CONFIG_ID);
      expect(retrieved).not.toBeNull();
    });

    it('stores and retrieves from memory', () => {
      storeTokens(CONFIG_ID, makeTokens(), 'memory');
      const retrieved = getTokens(CONFIG_ID);
      expect(retrieved).not.toBeNull();
    });

    it('computes expiresAt from expiresIn', () => {
      storeTokens(CONFIG_ID, makeTokens({ expiresIn: 3600 }), 'session');
      const retrieved = getTokens(CONFIG_ID);
      expect(retrieved!.expiresAt).toBeDefined();
      expect(retrieved!.expiresAt!).toBeGreaterThan(Date.now());
    });
  });

  describe('removeTokens', () => {
    it('removes stored tokens', () => {
      storeTokens(CONFIG_ID, makeTokens(), 'session');
      expect(hasTokens(CONFIG_ID)).toBe(true);
      removeTokens(CONFIG_ID);
      expect(hasTokens(CONFIG_ID)).toBe(false);
    });
  });

  describe('isTokenExpired', () => {
    it('returns true for null tokens', () => {
      expect(isTokenExpired(null)).toBe(true);
    });

    it('returns false for fresh tokens', () => {
      expect(isTokenExpired(makeTokens({ expiresAt: Date.now() + 3600_000 }))).toBe(false);
    });

    it('returns true for expired tokens', () => {
      expect(isTokenExpired(makeTokens({ expiresAt: Date.now() - 1000 }))).toBe(true);
    });
  });

  describe('isTokenExpiringSoon', () => {
    it('returns false for null tokens', () => {
      expect(isTokenExpiringSoon(null)).toBe(false);
    });

    it('returns true when within threshold', () => {
      expect(isTokenExpiringSoon(makeTokens({ expiresAt: Date.now() + 100_000 }), 200)).toBe(true);
    });
  });

  describe('getTimeUntilExpiry', () => {
    it('returns null for null tokens', () => {
      expect(getTimeUntilExpiry(null)).toBeNull();
    });

    it('returns remaining seconds', () => {
      const time = getTimeUntilExpiry(makeTokens({ expiresAt: Date.now() + 60_000 }));
      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThanOrEqual(60);
    });
  });

  describe('formatTimeUntilExpiry', () => {
    it('returns "Unknown" for null', () => {
      expect(formatTimeUntilExpiry(null)).toBe('Unknown');
    });

    it('returns "Expired" for past time', () => {
      expect(formatTimeUntilExpiry(makeTokens({ expiresAt: Date.now() - 1000 }))).toBe('Expired');
    });

    it('formats minutes', () => {
      expect(formatTimeUntilExpiry(makeTokens({ expiresAt: Date.now() + 120_000 }))).toContain('m');
    });

    it('formats hours', () => {
      expect(formatTimeUntilExpiry(makeTokens({ expiresAt: Date.now() + 7_200_000 }))).toContain('h');
    });
  });

  describe('getBearerToken', () => {
    it('returns null for null tokens', () => {
      expect(getBearerToken(null)).toBeNull();
    });

    it('returns formatted bearer string', () => {
      expect(getBearerToken(makeTokens())).toBe('Bearer access-123');
    });
  });

  describe('generateAuthorizationHeader', () => {
    it('generates header with default type', () => {
      expect(generateAuthorizationHeader('token123')).toBe('Bearer token123');
    });

    it('uses custom token type', () => {
      expect(generateAuthorizationHeader('token123', 'MAC')).toBe('MAC token123');
    });
  });
});
