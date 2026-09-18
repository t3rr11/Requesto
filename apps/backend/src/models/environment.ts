/**
 * Declared type of a variable's value. Substitution uses it to emit unquoted
 * literals for `number`/`boolean` variables inside JSON bodies and GraphQL
 * variables. An undefined type is treated as `string`.
 */
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
