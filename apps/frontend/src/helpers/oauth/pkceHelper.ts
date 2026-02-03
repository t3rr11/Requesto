/**
 * PKCE (Proof Key for Code Exchange) Helper Functions
 * Implements RFC 7636 for secure OAuth 2.0 authorization code flow
 */

/**
 * Generate a cryptographically random code verifier
 * Must be 43-128 characters long, using [A-Z][a-z][0-9]-._~
 * 
 * @param length - Length of the code verifier (default: 64)
 * @returns Base64URL-encoded random string
 */
export function generateCodeVerifier(length: number = 64): string {
  if (length < 43 || length > 128) {
    throw new Error('Code verifier length must be between 43 and 128 characters');
  }

  // Generate random bytes
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  // Convert to base64url (RFC 4648)
  return base64UrlEncode(array);
}

/**
 * Generate a code challenge from a code verifier
 * Uses S256 method (SHA-256 hash)
 * 
 * @param codeVerifier - The code verifier to hash
 * @returns Base64URL-encoded SHA-256 hash of the code verifier
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  // Encode the code verifier as UTF-8
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);

  // Hash with SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert to Uint8Array
  const hashArray = new Uint8Array(hashBuffer);

  // Encode as base64url
  return base64UrlEncode(hashArray);
}

/**
 * Convert Uint8Array to base64url encoding (RFC 4648)
 * base64url uses - instead of +, _ instead of /, and omits padding =
 * 
 * @param buffer - The buffer to encode
 * @returns Base64URL-encoded string
 */
function base64UrlEncode(buffer: Uint8Array): string {
  // Convert to regular base64
  const base64 = btoa(String.fromCharCode(...buffer));

  // Convert to base64url
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, ''); // Remove padding
}

/**
 * Validate a code verifier format
 * Must be 43-128 characters and contain only [A-Z][a-z][0-9]-._~
 * 
 * @param codeVerifier - The code verifier to validate
 * @returns True if valid
 */
export function isValidCodeVerifier(codeVerifier: string): boolean {
  if (codeVerifier.length < 43 || codeVerifier.length > 128) {
    return false;
  }

  // RFC 7636: code verifier must be [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
  const validPattern = /^[A-Za-z0-9\-._~]+$/;
  return validPattern.test(codeVerifier);
}

/**
 * Generate PKCE pair (verifier and challenge)
 * Convenience function to generate both at once
 * 
 * @param length - Length of the code verifier (default: 64)
 * @returns Object containing codeVerifier and codeChallenge
 */
export async function generatePKCEPair(length: number = 64): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  const codeVerifier = generateCodeVerifier(length);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  return {
    codeVerifier,
    codeChallenge,
  };
}
