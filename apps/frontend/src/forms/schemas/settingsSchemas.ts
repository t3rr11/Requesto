import { z } from 'zod';

export const settingsSchema = z.object({
  insecureTls: z.boolean(),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;
