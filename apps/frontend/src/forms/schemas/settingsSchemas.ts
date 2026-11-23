import { z } from 'zod';

export const settingsSchema = z.object({
  insecureTls: z.boolean(),
  saveRequestOnSend: z.boolean(),
  warnOnHttpErrors: z.boolean(),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;

export const appearanceSchema = z.object({
  disableEventThemes: z.boolean(),
  reduceMotion: z.boolean(),
  overrideEventTheme: z.string(),
});

export type AppearanceFormData = z.infer<typeof appearanceSchema>;
