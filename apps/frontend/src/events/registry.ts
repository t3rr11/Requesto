import type { EventTheme } from './types';

/**
 * Declarative event calendar. To add an event, append an entry here —
 * the backdrop and opt-out setting pick it up automatically.
 */
export const EVENT_THEMES: EventTheme[] = [
  {
    id: 'halloween',
    name: 'Halloween',
    headerDecoration: 'cobweb',
    start: '10-01',
    end: '10-31',
  },
];

function getMonthDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

export function getActiveEventTheme(date: Date = new Date(), events: EventTheme[] = EVENT_THEMES): EventTheme | null {
  const today = getMonthDay(date);

  return (
    events.find(event => {
      if (event.start <= event.end) {
        return today >= event.start && today <= event.end;
      }
      // Wrap-around range (e.g. "12-24" to "01-01").
      return today >= event.start || today <= event.end;
    }) ?? null
  );
}
