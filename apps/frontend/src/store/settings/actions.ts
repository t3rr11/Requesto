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
