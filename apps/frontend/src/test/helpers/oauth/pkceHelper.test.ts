import { describe, it, expect } from 'vitest';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  isValidCodeVerifier,
  generatePKCEPair,
} from '../../../helpers/oauth/pkceHelper';

describe('generateCodeVerifier', () => {
  it('generates a string of at least 43 characters', () => {
    const verifier = generateCodeVerifier();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
  });

  it('throws for length < 43', () => {
    expect(() => generateCodeVerifier(42)).toThrow();
  });

  it('throws for length > 128', () => {
    expect(() => generateCodeVerifier(129)).toThrow();
  });

  it('generates unique verifiers', () => {
    const a = generateCodeVerifier();
    const b = generateCodeVerifier();
    expect(a).not.toBe(b);
  });
});

describe('generateCodeChallenge', () => {
  it('generates a non-empty base64url string', async () => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    expect(challenge).toBeTruthy();
    expect(challenge).not.toContain('+');
    expect(challenge).not.toContain('/');
    expect(challenge).not.toContain('=');
  });

  it('produces consistent output for same input', async () => {
    const verifier = generateCodeVerifier();
    const a = await generateCodeChallenge(verifier);
    const b = await generateCodeChallenge(verifier);
    expect(a).toBe(b);
  });
});

describe('isValidCodeVerifier', () => {
  it('returns true for valid verifier', () => {
    const verifier = generateCodeVerifier();
    expect(isValidCodeVerifier(verifier)).toBe(true);
  });

  it('returns false for too short', () => {
    expect(isValidCodeVerifier('short')).toBe(false);
  });
});

describe('generatePKCEPair', () => {
  it('returns both verifier and challenge', async () => {
    const pair = await generatePKCEPair();
    expect(pair.codeVerifier).toBeTruthy();
    expect(pair.codeChallenge).toBeTruthy();
    expect(pair.codeVerifier).not.toBe(pair.codeChallenge);
  });
});
