import { useEffect, useState } from 'react';
import { getActiveEventTheme, getEventThemeById } from '../events/registry';
import type { EventTheme } from '../events/types';
import { useSettingsStore } from '../store/settings/store';

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Returns the event theme active right now, or null. Re-evaluates on mount
 * and on an hourly interval so an app left open across midnight transitions
 * automatically.
 *
 * Resolution order:
 * 1. Holiday & event themes disabled in settings: always null.
 * 2. A theme forced on via the Appearance override: that theme, regardless
 *    of the date (falling back to the date-based match when the override
 *    points at an event that is no longer registered).
 * 3. The date-based event window from the registry.
 */
export function useEventTheme(): EventTheme | null {
  const disableEventThemes = useSettingsStore(s => s.disableEventThemes);
  const overrideEventTheme = useSettingsStore(s => s.overrideEventTheme);
  const [dateEvent, setDateEvent] = useState<EventTheme | null>(() => getActiveEventTheme());

  useEffect(() => {
    setDateEvent(getActiveEventTheme());
    const interval = setInterval(() => setDateEvent(getActiveEventTheme()), CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (disableEventThemes) return null;
  if (overrideEventTheme) return getEventThemeById(overrideEventTheme) ?? dateEvent;
  return dateEvent;
}
