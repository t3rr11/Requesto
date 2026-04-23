export type Settings = {
  /**
   * When true, the backend ignores TLS certificate errors (e.g. self-signed
   * certs in chain) for OAuth token exchanges and proxied API requests.
   * Off by default — opt-in only.
   */
  insecureTls: boolean;
};
