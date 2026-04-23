import https from 'node:https';

/**
 * Returns an https.Agent that ignores certificate errors when `insecureTls`
 * is true. Used to support self-signed certificates in OAuth and proxied
 * requests when the user has explicitly enabled the global setting.
 *
 * Returns `undefined` when `insecureTls` is falsy so callers can spread it
 * into an axios config without overriding axios's default agent behaviour.
 */
export function getHttpsAgent(insecureTls?: boolean): https.Agent | undefined {
  if (!insecureTls) return undefined;
  return new https.Agent({ rejectUnauthorized: false });
}
