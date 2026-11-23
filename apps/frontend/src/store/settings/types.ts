export type Settings = {
  /**
   * When true, the backend ignores TLS certificate errors (e.g. self-signed
   * certs in chain) for OAuth token exchanges and proxied API requests.
   * Off by default — opt-in only.
   */
  insecureTls: boolean;

  /**
   * When true, requests that already exist in a collection are automatically
   * saved when they are sent (if they have unsaved changes). Requests that
   * have never been saved are skipped. Off by default — opt-in only.
   */
  saveRequestOnSend: boolean;

  /**
   * When true, holiday & event themes (e.g. seasonal background decorations
   * shown automatically during calendar periods) are disabled and the app
   * uses the standard look regardless of the date. Off by default — opt-out.
   * Takes precedence over overrideEventTheme.
   */
  disableEventThemes: boolean;

  /**
   * Force a specific holiday & event theme on regardless of the date, e.g. to
   * preview decorations outside their normal window. Null means auto: the
   * date-based window in the event registry decides. Ignored when
   * disableEventThemes is true.
   */
  overrideEventTheme: string | null;

  /**
   * When true, the collection runner shows an amber warning for responses that
   * a zero-test run would otherwise report as a plain pass: HTTP 4xx/5xx
   * statuses and GraphQL `errors` envelopes. On by default, opt-out.
   */
  warnOnHttpErrors: boolean;
};
