/** Error thrown for CLI configuration problems (bad paths, unknown names, malformed values). */
export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliError';
  }
}

/** Thrown when an OAuth config requires an interactive flow in a headless run. */
export class CliAuthError extends Error {
  constructor(
    readonly configId: string,
    message: string,
  ) {
    super(message);
    this.name = 'CliAuthError';
  }
}
