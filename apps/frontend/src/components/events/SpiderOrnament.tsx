import { useEffect, useRef, useState } from 'react';
import { useOrnamentSway } from '../../hooks/useOrnamentSway';

const STROKE_WIDTH = 1.2;
const SPIDER_RETURN_DELAY_MS = 5000;

function HangingSpider({ className = '' }: Readonly<{ className?: string }>) {
  return (
    <svg width="28" height="64" viewBox="0 0 28 64" fill="none" className={className} aria-hidden="true">
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
 * The interactive hanging spider ornament for the halloween event theme: it
 * sways periodically and on hover, and crawls up out of the header when
 * clicked before returning a few seconds later. Visibility is gated by the
 * EventHangingOrnament wrapper; this component renders whenever mounted.
 */
export function SpiderOrnament() {
  const swaying = useOrnamentSway(true);
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
    <button
      onClick={handleSpiderClick}
      className={`event-spider pointer-events-auto absolute top-0 left-0 z-10 hidden min-[1200px]:block ${
        spiderUp ? 'event-spider-up' : ''
      }`}
      tabIndex={-1}
    >
      <HangingSpider
        className={`event-spider-art block text-white opacity-25 ${swaying ? 'event-spider-sway' : ''}`}
      />
    </button>
  );
}
