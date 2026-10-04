import { describe, it, expect } from 'vitest';
import { getActiveEventTheme } from '../../events/registry';
import type { EventTheme } from '../../events/types';

const halloween: EventTheme = {
  id: 'halloween',
  name: 'Halloween',
  headerDecoration: 'cobweb',
  start: '10-01',
  end: '10-31',
};

const newYear: EventTheme = {
  id: 'new-year',
  name: 'New Year',
  headerDecoration: 'cobweb',
  start: '12-24',
  end: '01-01',
};

function date(monthDay: string): Date {
  const [month, day] = monthDay.split('-').map(Number);
  return new Date(2026, month - 1, day);
}

describe('getActiveEventTheme', () => {
  it('returns null when no events match', () => {
    expect(getActiveEventTheme(date('07-15'), [halloween])).toBeNull();
    expect(getActiveEventTheme(date('09-30'), [halloween])).toBeNull();
    expect(getActiveEventTheme(date('11-01'), [halloween])).toBeNull();
  });

  it('returns the active event within its range', () => {
    expect(getActiveEventTheme(date('10-15'), [halloween])).toBe(halloween);
  });

  it('matches the first and last day of the range inclusively', () => {
    expect(getActiveEventTheme(date('10-01'), [halloween])).toBe(halloween);
    expect(getActiveEventTheme(date('10-31'), [halloween])).toBe(halloween);
  });

  it('handles ranges that wrap across the year boundary', () => {
    expect(getActiveEventTheme(date('12-25'), [newYear])).toBe(newYear);
    expect(getActiveEventTheme(date('01-01'), [newYear])).toBe(newYear);
    expect(getActiveEventTheme(date('01-02'), [newYear])).toBeNull();
    expect(getActiveEventTheme(date('12-23'), [newYear])).toBeNull();
  });

  it('returns the first matching event when several overlap', () => {
    const first: EventTheme = { ...halloween, id: 'first' };
    const second: EventTheme = { ...halloween, id: 'second', start: '10-15' };
    expect(getActiveEventTheme(date('10-20'), [first, second])).toBe(first);
  });

  it('uses the real halloween window from the registry', () => {
    const active = getActiveEventTheme(new Date(2026, 9, 4));
    expect(active).toMatchObject({ id: 'halloween', headerDecoration: 'cobweb' });
    expect(getActiveEventTheme(new Date(2026, 8, 15))).toBeNull();
  });
});
