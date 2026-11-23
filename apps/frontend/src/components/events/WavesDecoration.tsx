/**
 * Animated ocean waves along the bottom edge of the header for the waves event
 * theme. The surfing Santa ornament rides on top of them and is anchored in
 * the header layout by EventHangingOrnament.
 */
export function WavesDecoration() {
  return (
    <div
      className="event-header-decoration pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="event-waves event-waves-back absolute inset-x-0 bottom-0 h-3.5" />
      <div className="event-waves event-waves-front absolute inset-x-0 bottom-0 h-3.5" />
    </div>
  );
}
