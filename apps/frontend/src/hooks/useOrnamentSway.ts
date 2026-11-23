import { useEffect, useState } from 'react';

const SWAY_DURATION_MS = 4000;
const FIRST_SWAY_DELAY_MS = 12000;
const SWAY_INTERVAL_MIN_MS = 50000;
const SWAY_INTERVAL_MAX_MS = 70000;

function randomSwayDelay(): number {
  return SWAY_INTERVAL_MIN_MS + Math.random() * (SWAY_INTERVAL_MAX_MS - SWAY_INTERVAL_MIN_MS);
}

/**
 * Periodically enables an event theme ornament's sway animation for a few
 * seconds, then returns it to static. Each cycle starts after a randomized
 * delay so the motion feels organic rather than metronomic. Runs only while
 * the ornament is rendered.
 */
export function useOrnamentSway(active: boolean): boolean {
  const [swaying, setSwaying] = useState(false);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const scheduleSway = (delay: number) => {
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setSwaying(true);
          timers.push(
            setTimeout(() => {
              if (cancelled) return;
              setSwaying(false);
              scheduleSway(randomSwayDelay());
            }, SWAY_DURATION_MS)
          );
        }, delay)
      );
    };

    scheduleSway(FIRST_SWAY_DELAY_MS);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [active]);

  return swaying;
}
