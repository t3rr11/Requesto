import { z } from 'zod';

const environmentVariableSchema = z.object({
  key: z.string(),
  value: z.string(),
  enabled: z.boolean(),
  isSecret: z.boolean().optional(),
});

export const saveEnvironmentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Environment name is required').trim(),
  variables: z.array(environmentVariableSchema),
});

export const setActiveEnvironmentSchema = z.object({
  environmentId: z.string().min(1, 'Environment ID is required'),
});

/** Imported Postman environment format */
export const importEnvironmentSchema = z.object({
  name: z.string(),
  variables: z.array(environmentVariableSchema).optional(),
  // Postman format wraps variables in `values` array
  values: z
    .array(
      z.object({
        key: z.string(),
        value: z.string(),
        enabled: z.boolean().optional(),
        type: z.string().optional(),
      }),
    )
    .optional(),
});

export type SaveEnvironmentDto = z.infer<typeof saveEnvironmentSchema>;
export type SetActiveEnvironmentDto = z.infer<typeof setActiveEnvironmentSchema>;
export type ImportEnvironmentDto = z.infer<typeof importEnvironmentSchema>;
