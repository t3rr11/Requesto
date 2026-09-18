/** Declared type of a variable's value; undefined is treated as 'string'. */
export type EnvironmentVariableType = 'string' | 'number' | 'boolean';

export interface EnvironmentVariable {
  key: string;
  value: string;
  currentValue?: string;
  enabled: boolean;
  isSecret?: boolean;
  type?: EnvironmentVariableType;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
}

export interface EnvironmentsData {
  activeEnvironmentId: string | null;
  environments: Environment[];
}
