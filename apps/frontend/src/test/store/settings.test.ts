import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../../store/settings/store';

describe('settings store', () => {
  beforeEach(() => {
    useSettingsStore.setState({ insecureTls: false });
  });

  it('defaults insecureTls to false', () => {
    expect(useSettingsStore.getState().insecureTls).toBe(false);
  });

  it('enables insecureTls via setter', () => {
    useSettingsStore.getState().setInsecureTls(true);
    expect(useSettingsStore.getState().insecureTls).toBe(true);
  });

  it('disables insecureTls via setter', () => {
    useSettingsStore.getState().setInsecureTls(true);
    useSettingsStore.getState().setInsecureTls(false);
    expect(useSettingsStore.getState().insecureTls).toBe(false);
  });

  it('persists insecureTls to localStorage', () => {
    useSettingsStore.getState().setInsecureTls(true);
    const raw = localStorage.getItem('requesto-settings-storage');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.insecureTls).toBe(true);
  });
});
