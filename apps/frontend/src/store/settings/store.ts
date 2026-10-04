import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as actions from './actions';
import type { Settings } from './types';

type SettingsState = Settings & {
  setInsecureTls: (value: boolean) => void;
  setSaveRequestOnSend: (value: boolean) => void;
  setDisableEventThemes: (value: boolean) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      insecureTls: false,
      setInsecureTls: (value) => actions.setInsecureTls(set, value),
      saveRequestOnSend: false,
      setSaveRequestOnSend: (value) => actions.setSaveRequestOnSend(set, value),
      disableEventThemes: false,
      setDisableEventThemes: (value) => actions.setDisableEventThemes(set, value),
    }),
    {
      name: 'requesto-settings-storage',
    },
  ),
);
