export type EventHeaderDecorationKind = 'cobweb';

/** Interactive ornament hanging from the header for an event theme. */
export type EventHangingOrnamentKind = 'spider';

export type EventTheme = {
  /** Stable identifier, e.g. "halloween". */
  id: string;

  /** Human-friendly name, usable in copy such as settings descriptions. */
  name: string;

  /** Header decoration to render for this event. */
  headerDecoration: EventHeaderDecorationKind;

  /**
   * Interactive ornament hanging from the header's top edge in the gap after
   * the environment selector, e.g. a spider for Halloween or a surfing Santa
   * for Christmas. Optional, themes without one omit the field.
   */
  hangingOrnament?: EventHangingOrnamentKind;

  /**
   * Inclusive start of the event window as "MM-DD" in local time.
   * If start is greater than end the range wraps across the year
   * boundary (e.g. "12-24" to "01-01").
   */
  start: string;

  /** Inclusive end of the event window as "MM-DD" in local time. */
  end: string;
};
