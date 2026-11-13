import { z } from 'zod';

export const environmentVariableSchema = z.object({
  key: z.string(),
  value: z.string(),
  enabled: z.boolean(),
  isSecret: z.boolean().optional(),
  type: z.enum(['string', 'number', 'boolean']).optional(),
});

export const saveEnvironmentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Environment name is required').trim(),
  variables: z.array(environmentVariableSchema),
});

export const setActiveEnvironmentSchema = z.object({
  environmentId: z.string().min(1, 'Environment ID is required'),
});

export type SaveEnvironmentDto = z.infer<typeof saveEnvironmentSchema>;
export type SetActiveEnvironmentDto = z.infer<typeof setActiveEnvironmentSchema>;
