export interface EnvironmentVariable {
  key: string;
  value: string;
  currentValue?: string;
  enabled: boolean;
  isSecret?: boolean;
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
