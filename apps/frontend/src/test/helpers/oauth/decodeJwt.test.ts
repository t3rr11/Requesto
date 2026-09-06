import { describe, it, expect } from 'vitest';
import { decodeJwtPayload, orderJwtClaims } from '../../../helpers/oauth/decodeJwt';

function encodeSegment(value: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(value)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeJwt(payload: Record<string, unknown>): string {
  const header = encodeSegment(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = encodeSegment(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('decodeJwt', () => {
  describe('decodeJwtPayload', () => {
    it('decodes a valid JWT payload', () => {
      const payload = { sub: 'user-1', roles: ['admin'], exp: 1700000000 };
      const decoded = decodeJwtPayload(makeJwt(payload));
      expect(decoded).toEqual(payload);
    });

    it('decodes JWTs with non-ASCII characters', () => {
      const decoded = decodeJwtPayload(makeJwt({ name: 'Jürgen ☃' }));
      expect(decoded?.name).toBe('Jürgen ☃');
    });

    it('handles base64url-safe characters', () => {
      // Payload that base64-encodes to characters requiring url-safe translation.
      const decoded = decodeJwtPayload(makeJwt({ value: '>>??##' }));
      expect(decoded?.value).toBe('>>??##');
    });

    it('returns null for opaque (non-JWT) tokens', () => {
      expect(decodeJwtPayload('some-opaque-access-token-value')).toBeNull();
      expect(decodeJwtPayload('abc.def.ghi')).toBeNull();
    });

    it('returns null for undefined/null/empty tokens', () => {
      expect(decodeJwtPayload(undefined)).toBeNull();
      expect(decodeJwtPayload(null)).toBeNull();
      expect(decodeJwtPayload('')).toBeNull();
    });

    it('returns null when segments are missing', () => {
      expect(decodeJwtPayload('only-two.parts')).toBeNull();
      expect(decodeJwtPayload('a.b.c.d')).toBeNull();
    });

    it('returns null when payload is not valid JSON', () => {
      const token = `${encodeSegment('{"alg":"none"}')}.${encodeSegment('not json')}.sig`;
      expect(decodeJwtPayload(token)).toBeNull();
    });

    it('returns null when payload is valid JSON but not an object', () => {
      const token = `${encodeSegment('{"alg":"none"}')}.${encodeSegment('[1,2,3]')}.sig`;
      expect(decodeJwtPayload(token)).toBeNull();
    });

    it('returns null when header is not valid JSON', () => {
      const token = `${encodeSegment('nope')}.${encodeSegment('{"a":1}')}.sig`;
      expect(decodeJwtPayload(token)).toBeNull();
    });
  });

  describe('orderJwtClaims', () => {
    it('puts high-signal claims first in priority order', () => {
      const ordered = orderJwtClaims({
        zeta: 1,
        scope: 'read',
        alpha: 2,
        roles: ['admin'],
        iss: 'https://issuer',
        aud: 'api://x',
      });
      const keys = ordered.map(([k]) => k);
      expect(keys.indexOf('iss')).toBeLessThan(keys.indexOf('aud'));
      expect(keys.indexOf('aud')).toBeLessThan(keys.indexOf('scope'));
      expect(keys.indexOf('scope')).toBeLessThan(keys.indexOf('roles'));
      expect(keys.indexOf('roles')).toBeLessThan(keys.indexOf('alpha'));
      expect(keys.indexOf('alpha')).toBeLessThan(keys.indexOf('zeta'));
    });

    it('sorts remaining claims alphabetically', () => {
      const ordered = orderJwtClaims({ zeta: 1, alpha: 2, mike: 3, beta: 4 });
      const keys = ordered.map(([k]) => k);
      expect(keys).toEqual(['alpha', 'beta', 'mike', 'zeta']);
    });

    it('handles an empty payload', () => {
      expect(orderJwtClaims({})).toEqual([]);
    });
  });
});
