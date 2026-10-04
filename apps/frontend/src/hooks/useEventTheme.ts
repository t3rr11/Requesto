import { useEffect, useState } from 'react';
import { getActiveEventTheme } from '../events/registry';
import type { EventTheme } from '../events/types';

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Returns the event theme active right now, or null. Re-evaluates on mount
 * and on an hourly interval so an app left open across midnight transitions
 * automatically.
 */
export function useEventTheme(): EventTheme | null {
  const [event, setEvent] = useState<EventTheme | null>(() => getActiveEventTheme());

  useEffect(() => {
    setEvent(getActiveEventTheme());
    const interval = setInterval(() => setEvent(getActiveEventTheme()), CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return event;
}
