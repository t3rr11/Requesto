import type { Settings } from './types';

type SettingsSetState = (partial: Partial<Settings>) => void;

export function setInsecureTls(set: SettingsSetState, value: boolean): void {
  set({ insecureTls: value });
}
