const WEB_SIZE = 110;
const STROKE_WIDTH = 1.2;

function Cobweb({ className = '' }: Readonly<{ className?: string }>) {
  return (
    <svg width={WEB_SIZE} height={WEB_SIZE} viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true">
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

/**
 * Cobweb corner artwork for the cobweb event theme. The interactive hanging
 * ornament (e.g. the spider) lives in EventHangingOrnament, anchored in the
 * header layout after the environment selector.
 */
export function CobwebDecoration() {
  return (
    <div
      className="event-header-decoration pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <Cobweb className="absolute top-0 left-0 text-white opacity-20" />
      <Cobweb className="absolute top-0 right-0 -scale-x-100 text-white opacity-20" />
    </div>
  );
}
