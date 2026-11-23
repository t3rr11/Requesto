import type { Settings } from './types';

type SettingsSetState = (partial: Partial<Settings>) => void;

export function setInsecureTls(set: SettingsSetState, value: boolean): void {
  set({ insecureTls: value });
}

export function setSaveRequestOnSend(set: SettingsSetState, value: boolean): void {
  set({ saveRequestOnSend: value });
}

export function setDisableEventThemes(set: SettingsSetState, value: boolean): void {
  set({ disableEventThemes: value });
}

export function setReduceMotion(set: SettingsSetState, value: boolean): void {
  set({ reduceMotion: value });
}

export function setOverrideEventTheme(set: SettingsSetState, value: string | null): void {
  set({ overrideEventTheme: value });
}

export function setWarnOnHttpErrors(set: SettingsSetState, value: boolean): void {
  set({ warnOnHttpErrors: value });
}
