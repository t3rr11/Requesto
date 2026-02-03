/**
 * OAuth Redirect URI Helper
 * Handles dynamic redirect URI detection for different deployment scenarios
 */

export interface RedirectUriOptions {
  customPath?: string; // Default: '/oauth/callback'
  forceProtocol?: 'http' | 'https';
  forcePort?: number;
}

/**
 * Get the redirect URI for OAuth callbacks
 * Automatically detects the current environment (localhost, production, etc.)
 * 
 * @param options - Optional configuration
 * @returns The redirect URI to use
 */
export function getRedirectUri(options: RedirectUriOptions = {}): string {
  const {
    customPath = '/oauth/callback',
    forceProtocol,
    forcePort,
  } = options;

  const protocol = forceProtocol || window.location.protocol.replace(':', '');
  const hostname = window.location.hostname;
  const port = forcePort || window.location.port;

  // Build base URL
  let baseUrl = `${protocol}://${hostname}`;

  // Only add port if non-standard
  if (port && 
      port !== '' && 
      !(protocol === 'http' && port === '80') && 
      !(protocol === 'https' && port === '443')) {
    baseUrl += `:${port}`;
  }

  return `${baseUrl}${customPath}`;
}

/**
 * Get redirect URI specifically for Microsoft EntraID/Azure AD
 * EntraID only allows http:// for localhost, requires https:// for all other domains
 * 
 * @param options - Optional configuration
 * @returns The redirect URI formatted for EntraID
 */
export function getRedirectUriForEntraId(options: RedirectUriOptions = {}): string {
  const {
    customPath = '/oauth/callback',
  } = options;

  const hostname = window.location.hostname;
  const port = window.location.port;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocalhost) {
    // EntraID allows http://localhost
    const portPart = port ? `:${port}` : '';
    return `http://localhost${portPart}${customPath}`;
  } else {
    // EntraID requires https:// for non-localhost domains
    return `https://${hostname}${customPath}`;
  }
}

/**
 * Get redirect URI for Google OAuth
 * Google allows both http and https for localhost
 * 
 * @param options - Optional configuration
 * @returns The redirect URI formatted for Google
 */
export function getRedirectUriForGoogle(options: RedirectUriOptions = {}): string {
  // Google is flexible, use standard detection
  return getRedirectUri(options);
}

/**
 * Get redirect URI for GitHub OAuth
 * GitHub allows http://localhost but requires https for production
 * 
 * @param options - Optional configuration
 * @returns The redirect URI formatted for GitHub
 */
export function getRedirectUriForGitHub(options: RedirectUriOptions = {}): string {
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  
  if (isLocalhost) {
    // GitHub allows http://localhost
    return getRedirectUri(options);
  } else {
    // Require https for production
    return getRedirectUri({ ...options, forceProtocol: 'https' });
  }
}

/**
 * Get the appropriate redirect URI for a specific OAuth provider
 * 
 * @param provider - The OAuth provider ('microsoft', 'google', 'github', 'custom')
 * @param options - Optional configuration
 * @returns Provider-specific redirect URI
 */
export function getRedirectUriForProvider(
  provider: string,
  options: RedirectUriOptions = {}
): string {
  switch (provider.toLowerCase()) {
    case 'microsoft':
    case 'entra':
    case 'entraid':
    case 'azuread':
    case 'azure':
      return getRedirectUriForEntraId(options);
    
    case 'google':
      return getRedirectUriForGoogle(options);
    
    case 'github':
      return getRedirectUriForGitHub(options);
    
    case 'custom':
    default:
      return getRedirectUri(options);
  }
}

/**
 * Check if the current environment is localhost
 * @returns True if running on localhost
 */
export function isLocalhost(): boolean {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

/**
 * Check if the current environment is using HTTPS
 * @returns True if using HTTPS protocol
 */
export function isSecureContext(): boolean {
  return window.location.protocol === 'https:';
}

/**
 * Get environment information for debugging
 * @returns Object with current environment details
 */
export function getEnvironmentInfo(): {
  protocol: string;
  hostname: string;
  port: string;
  isLocalhost: boolean;
  isSecure: boolean;
  currentUrl: string;
  recommendedRedirectUri: string;
} {
  return {
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    port: window.location.port,
    isLocalhost: isLocalhost(),
    isSecure: isSecureContext(),
    currentUrl: window.location.href,
    recommendedRedirectUri: getRedirectUri(),
  };
}

/**
 * Validate that a redirect URI matches security requirements
 * 
 * @param redirectUri - The redirect URI to validate
 * @param requireHttps - Whether to require HTTPS (default: true for production)
 * @returns Object with validation result and any warnings
 */
export function validateRedirectUri(
  redirectUri: string,
  requireHttps: boolean = !isLocalhost()
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  let valid = true;

  try {
    const url = new URL(redirectUri);

    // Check protocol
    if (requireHttps && url.protocol !== 'https:') {
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        warnings.push('Using http:// with localhost. This is acceptable for development.');
      } else {
        warnings.push('Redirect URI should use https:// in production.');
        valid = false;
      }
    }

    // Check for localhost with non-localhost current context
    if ((url.hostname === 'localhost' || url.hostname === '127.0.0.1') && !isLocalhost()) {
      warnings.push('Redirect URI uses localhost but app is not running on localhost. This will fail.');
      valid = false;
    }

    // Check for port mismatch
    const currentPort = window.location.port;
    if (url.hostname === window.location.hostname && url.port !== currentPort) {
      warnings.push(`Redirect URI port (${url.port}) doesn't match current port (${currentPort}). Ensure this is intentional.`);
    }

  } catch (error) {
    warnings.push('Invalid redirect URI format');
    valid = false;
  }

  return { valid, warnings };
}
