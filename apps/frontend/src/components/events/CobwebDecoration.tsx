import { useEffect, useRef, useState } from 'react';

const WEB_SIZE = 110;
const STROKE_WIDTH = 1.2;

const SWAY_DURATION_MS = 4000;
const FIRST_SWAY_DELAY_MS = 12000;
const SWAY_INTERVAL_MIN_MS = 50000;
const SWAY_INTERVAL_MAX_MS = 70000;
const SPIDER_RETURN_DELAY_MS = 5000;

function randomSwayDelay(): number {
  return SWAY_INTERVAL_MIN_MS + Math.random() * (SWAY_INTERVAL_MAX_MS - SWAY_INTERVAL_MIN_MS);
}

/**
 * Periodically enables the spider's sway animation for a few seconds, then
 * returns it to static. Each cycle starts after a randomized delay so the
 * motion feels organic rather than metronomic.
 */
function useSpiderSway(): boolean {
  const [swaying, setSwaying] = useState(false);

  useEffect(() => {
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
  }, []);

  return swaying;
}

function Cobweb({ className = '' }: Readonly<{ className?: string }>) {
  return (
    <svg width={WEB_SIZE} height={WEB_SIZE} viewBox="0 0 100 100" fill="none" className={className}>
      <path
        d="M0 0 L100 0 M0 0 L92.4 38.3 M0 0 L70.7 70.7 M0 0 L38.3 92.4 M0 0 L0 100"
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
      />
      <path
        d="M35 0 Q28.6 5.7 32.3 13.4 Q24.2 16.2 24.7 24.7 Q16.2 24.2 13.4 32.3 Q5.7 28.6 0 35"
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
      />
      <path
        d="M65 0 Q53.2 10.6 60.1 24.9 Q45.1 30.1 46 46 Q30.1 45.1 24.9 60.1 Q10.6 53.2 0 65"
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
      />
      <path
        d="M95 0 Q77.7 15.5 87.8 36.4 Q65.9 44 67.2 67.2 Q44 65.9 36.4 87.8 Q15.5 77.7 0 95"
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
      />
    </svg>
  );
}

function HangingSpider({ className = '' }: Readonly<{ className?: string }>) {
  return (
    <svg width="28" height="64" viewBox="0 0 28 64" fill="none" className={className}>
      <path d="M14 0 L14 21" stroke="currentColor" strokeWidth={STROKE_WIDTH} />
      <circle cx="14" cy="27" r="3.6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="14" cy="38" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M10.8 25 Q4.5 22 2.5 15.5 M10.2 29 Q3 29 0.8 24 M10.2 33 Q3.5 35 1.5 41 M11 36.5 Q5.5 41.5 4.5 49"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M17.2 25 Q23.5 22 25.5 15.5 M17.8 29 Q25 29 27.2 24 M17.8 33 Q24.5 35 26.5 41 M17 36.5 Q22.5 41.5 23.5 49"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Cobweb corner artwork with an interactive hanging spider: it sways
 * periodically and on hover, and crawls up out of the header when clicked
 * before returning a few seconds later.
 */
export function CobwebDecoration() {
  const swaying = useSpiderSway();
  const [spiderUp, setSpiderUp] = useState(false);
  const returnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (returnTimer.current) {
        clearTimeout(returnTimer.current);
      }
    };
  }, []);

  const handleSpiderClick = () => {
    if (spiderUp) return;

    setSpiderUp(true);

    if (returnTimer.current) {
      clearTimeout(returnTimer.current);
    }
    returnTimer.current = setTimeout(() => setSpiderUp(false), SPIDER_RETURN_DELAY_MS);
  };

  return (
    <div
      className="event-header-decoration pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <Cobweb className="absolute top-0 left-0 text-white opacity-20" />
      <Cobweb className="absolute top-0 right-0 -scale-x-100 text-white opacity-20" />
      <button
        onClick={handleSpiderClick}
        className={`event-spider pointer-events-auto absolute top-0 left-100 z-10 ${
          spiderUp ? 'event-spider-up' : ''
        }`}
        tabIndex={-1}
      >
        <HangingSpider
          className={`event-spider-art block text-white opacity-25 ${swaying ? 'event-spider-sway' : ''}`}
        />
      </button>
    </div>
  );
}
