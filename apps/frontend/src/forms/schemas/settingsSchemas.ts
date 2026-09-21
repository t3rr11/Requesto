import { z } from 'zod';

export const settingsSchema = z.object({
  insecureTls: z.boolean(),
  saveRequestOnSend: z.boolean(),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;
