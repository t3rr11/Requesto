import { z } from 'zod';

export const newEnvironmentSchema = z.object({
  name: z.string().min(1, 'Environment name is required').trim(),
});

export type NewEnvironmentFormData = z.infer<typeof newEnvironmentSchema>;
