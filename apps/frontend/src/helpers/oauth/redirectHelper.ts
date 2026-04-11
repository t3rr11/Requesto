export type RedirectUriOptions = {
  customPath?: string;
  forceProtocol?: 'http' | 'https';
  forcePort?: number;
};

export function getRedirectUri(options: RedirectUriOptions = {}): string {
  const { customPath = '/oauth/callback', forceProtocol, forcePort } = options;
  const protocol = forceProtocol || window.location.protocol.replace(':', '');
  const hostname = window.location.hostname;
  const port = forcePort?.toString() || window.location.port;

  let base = `${protocol}://${hostname}`;
  if (port && !(protocol === 'http' && port === '80') && !(protocol === 'https' && port === '443')) {
    base += `:${port}`;
  }
  return `${base}${customPath}`;
}

export function getRedirectUriForEntraId(options: RedirectUriOptions = {}): string {
  const { customPath = '/oauth/callback' } = options;
  const hostname = window.location.hostname;
  const port = window.location.port;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost${port ? `:${port}` : ''}${customPath}`;
  }
  return `https://${hostname}${customPath}`;
}

export function getRedirectUriForProvider(provider: string, options: RedirectUriOptions = {}): string {
  switch (provider.toLowerCase()) {
    case 'microsoft': case 'entra': case 'entraid': case 'azuread': case 'azure':
      return getRedirectUriForEntraId(options);
    case 'github': {
      const h = window.location.hostname;
      if (h === 'localhost' || h === '127.0.0.1') return getRedirectUri(options);
      return getRedirectUri({ ...options, forceProtocol: 'https' });
    }
    default:
      return getRedirectUri(options);
  }
}

export function isLocalhost(): boolean {
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}

export function isSecureContext(): boolean {
  return window.location.protocol === 'https:';
}

export function validateRedirectUri(
  redirectUri: string,
  requireHttps = !isLocalhost(),
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  let valid = true;
  try {
    const url = new URL(redirectUri);
    if (requireHttps && url.protocol !== 'https:') {
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        warnings.push('Using http:// with localhost. Acceptable for development.');
      } else {
        warnings.push('Redirect URI should use https:// in production.');
        valid = false;
      }
    }
  } catch {
    warnings.push('Invalid redirect URI format');
    valid = false;
  }
  return { valid, warnings };
}
