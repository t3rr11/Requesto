export type EnvironmentVariable = {
  key: string;
  value: string;
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
