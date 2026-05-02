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
