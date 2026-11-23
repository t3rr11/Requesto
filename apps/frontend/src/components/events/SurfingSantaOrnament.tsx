import { useSantaWipeout, type SantaPhase } from '../../hooks/useSantaWipeout';

const RIDER_PHASE_CLASSES: Record<SantaPhase, string> = {
  surfing: '',
  'wiped-out': 'event-santa-wiped-out',
  jumping: 'event-santa-jumping',
};

const BOARD_PHASE_CLASSES: Record<SantaPhase, string> = {
  surfing: '',
  'wiped-out': 'event-santa-board-rocked',
  jumping: 'event-santa-board-landing',
};

function SurfingSanta({ phase, className = '' }: Readonly<{ phase: SantaPhase; className?: string }>) {
  return (
    <svg
      width="42"
      height="36"
      viewBox="0 0 56 48"
      fill="none"
      className={`overflow-visible ${phase === 'surfing' ? 'event-santa-sway' : ''} ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Clips everything below the waterline so Santa sinks into the sea instead of dropping out of the header. */}
        <clipPath id="santa-water-clip">
          <rect x="-40" y="-40" width="136" height="84" />
        </clipPath>
      </defs>

      <g className={`event-santa-board ${BOARD_PHASE_CLASSES[phase]}`}>
        <ellipse cx="28" cy="44" rx="26" ry="3.5" className="fill-white" />
        <path d="M10 44 Q28 41.5 46 44" className="stroke-red-500" strokeWidth="1.6" strokeLinecap="round" />
      </g>

      <g clipPath="url(#santa-water-clip)">
        <g className={`event-santa-rider ${RIDER_PHASE_CLASSES[phase]}`}>
          <path d="M23 32 L20 41 M33 32 L36 41" className="stroke-red-700" strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="19" cy="42" rx="3.4" ry="1.8" className="fill-gray-900" />
          <ellipse cx="37" cy="42" rx="3.4" ry="1.8" className="fill-gray-900" />

          <path d="M21 22 L9 27 M35 22 L47 16" className="stroke-red-500" strokeWidth="4" strokeLinecap="round" />
          <circle cx="8" cy="27.5" r="2.5" className="fill-white" />
          <circle cx="48" cy="15.5" r="2.5" className="fill-white" />

          <rect x="20" y="18" width="16" height="17" rx="5" className="fill-red-500" />
          <rect x="20" y="33" width="16" height="2.5" rx="1.2" className="fill-white" />
          <rect x="20" y="28" width="16" height="3" className="fill-gray-900" />
          <rect x="26" y="27.6" width="4" height="3.8" rx="0.8" className="fill-amber-300" />

          <circle cx="28" cy="13" r="6" className="fill-orange-200" />
          <path d="M22 13 Q22 25 28 25 Q34 25 34 13 Q28 17.5 22 13 Z" className="fill-white" />
          <circle cx="25.6" cy="12" r="0.8" className="fill-gray-900" />
          <circle cx="30.4" cy="12" r="0.8" className="fill-gray-900" />
          <path d="M21.5 10.5 Q22 1 30 1 Q36 1 38 6 L34.5 10.5 Z" className="fill-red-500" />
          <rect x="21" y="9.5" width="14.5" height="3.2" rx="1.6" className="fill-white" />
          <circle cx="38" cy="6" r="2.5" className="fill-white" />
        </g>
      </g>

      {phase === 'wiped-out' && (
        <g className="fill-white">
          <circle cx="30" cy="30" r="1.6" className="event-santa-drop event-santa-drop-1" />
          <circle cx="30" cy="30" r="1.2" className="event-santa-drop event-santa-drop-2" />
          <circle cx="30" cy="30" r="1.4" className="event-santa-drop event-santa-drop-3" />
        </g>
      )}
    </svg>
  );
}

/**
 * The interactive surfing Santa ornament for the christmas event theme. He
 * rides the waves along the bottom of the header; clicking him rocks the board
 * and flips him into the water, and a few seconds later he flips back onto it.
 * Visibility is gated by the EventHangingOrnament wrapper; this component
 * renders whenever mounted and expects to be anchored at the header's bottom.
 */
export function SurfingSantaOrnament() {
  const { phase, knockOff } = useSantaWipeout();

  return (
    <button
      onClick={knockOff}
      className="event-santa pointer-events-auto absolute bottom-0 left-0 z-10 hidden min-[1200px]:block"
      tabIndex={-1}
    >
      <SurfingSanta phase={phase} className="block opacity-90 dark:opacity-70 dark:saturate-50 dark:brightness-90" />
    </button>
  );
}
