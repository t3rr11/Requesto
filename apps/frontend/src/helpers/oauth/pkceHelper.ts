/**
 * PKCE (Proof Key for Code Exchange) — RFC 7636
 */

export function generateCodeVerifier(length = 64): string {
  if (length < 43 || length > 128) throw new Error('Code verifier length must be between 43 and 128 characters');
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const data = new TextEncoder().encode(codeVerifier);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return base64UrlEncode(hash);
}

function base64UrlEncode(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function isValidCodeVerifier(v: string): boolean {
  return v.length >= 43 && v.length <= 128 && /^[A-Za-z0-9\-._~]+$/.test(v);
}

export async function generatePKCEPair(length = 64): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const codeVerifier = generateCodeVerifier(length);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  return { codeVerifier, codeChallenge };
}
