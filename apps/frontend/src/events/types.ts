export type EventHeaderDecorationKind = 'cobweb' | 'waves';

/** Interactive ornament anchored in the header for an event theme. */
export type EventHangingOrnamentKind = 'spider' | 'surfing-santa';

export type EventTheme = {
  /** Stable identifier, e.g. "halloween". */
  id: string;

  /** Human-friendly name, usable in copy such as settings descriptions. */
  name: string;

  /** Header decoration to render for this event. */
  headerDecoration: EventHeaderDecorationKind;

  /**
   * Interactive ornament anchored in the header after the environment
   * selector, e.g. a spider hanging from the top edge for Halloween or a
   * surfing Santa riding the bottom edge for Christmas. Optional, themes
   * without one omit the field.
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
