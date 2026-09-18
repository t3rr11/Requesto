/**
 * Declared type of a variable's value. Substitution uses it to emit unquoted
 * literals for `number`/`boolean` variables inside JSON bodies and GraphQL
 * variables. An undefined type is treated as `string`.
 */
export type EnvironmentVariableType = 'string' | 'number' | 'boolean';

export type EnvironmentVariable = {
  key: string;
  /** The initial value — committed to version control and shared with the team. */
  value: string;
  /**
   * The current (local) value — overrides `value` at runtime.
   * Set by pre-request scripts; stored in a gitignored sidecar file.
   */
  currentValue?: string;
  enabled: boolean;
  isSecret?: boolean;
  type?: EnvironmentVariableType;
};

export type Environment = {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
};

export type EnvironmentsData = {
  activeEnvironmentId: string | null;
  environments: Environment[];
};
