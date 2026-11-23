import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { useEventTheme } from '../../hooks/useEventTheme';
import type { EventTheme } from '../../events/types';
import { EventHangingOrnament } from '../../components/events/EventHangingOrnament';
import { SpiderOrnament } from '../../components/events/SpiderOrnament';
import { SurfingSantaOrnament } from '../../components/events/SurfingSantaOrnament';

vi.mock('../../hooks/useEventTheme', () => ({
  useEventTheme: vi.fn(),
}));

const halloweenWithSpider: EventTheme = {
  id: 'halloween',
  name: 'Halloween',
  headerDecoration: 'cobweb',
  hangingOrnament: 'spider',
  start: '10-01',
  end: '10-31',
};

const christmasWithSanta: EventTheme = {
  id: 'christmas',
  name: 'Christmas',
  headerDecoration: 'waves',
  hangingOrnament: 'surfing-santa',
  start: '11-22',
  end: '12-27',
};

const halloweenWithoutOrnament: EventTheme = {
  id: 'halloween',
  name: 'Halloween',
  headerDecoration: 'cobweb',
  start: '10-01',
  end: '10-31',
};

describe('EventHangingOrnament', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when no event theme is active', () => {
    vi.mocked(useEventTheme).mockReturnValue(null);
    const { container } = render(<EventHangingOrnament />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the active event does not declare a hanging ornament', () => {
    vi.mocked(useEventTheme).mockReturnValue(halloweenWithoutOrnament);
    const { container } = render(<EventHangingOrnament />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the ornament declared by the active event', () => {
    vi.mocked(useEventTheme).mockReturnValue(halloweenWithSpider);
    const { container } = render(<EventHangingOrnament />);
    expect(container.querySelector('.event-spider')).not.toBeNull();
    expect(container.querySelector('.event-spider-art')).not.toBeNull();
  });

  it('renders the surfing Santa for the christmas event', () => {
    vi.mocked(useEventTheme).mockReturnValue(christmasWithSanta);
    const { container } = render(<EventHangingOrnament />);
    expect(container.querySelector('.event-santa')).not.toBeNull();
  });
});

describe('SurfingSantaOrnament', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is knocked off when clicked, jumps back on after the delay and ignores clicks meanwhile', () => {
    vi.useFakeTimers();
    const { container } = render(<SurfingSantaOrnament />);
    const santa = container.querySelector('.event-santa') as HTMLElement;
    expect(container.querySelector('.event-santa-rider')?.getAttribute('class')).not.toMatch(/wiped-out|jumping/);

    fireEvent.click(santa);
    expect(container.querySelector('.event-santa-wiped-out')).not.toBeNull();
    expect(container.querySelector('.event-santa-board-rocked')).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    fireEvent.click(santa);
    expect(container.querySelector('.event-santa-wiped-out')).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(container.querySelector('.event-santa-jumping')).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(container.querySelector('.event-santa-jumping')).toBeNull();
    expect(container.querySelector('.event-santa-wiped-out')).toBeNull();
  });
});

describe('SpiderOrnament', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('crawls up when clicked and returns after the delay', () => {
    vi.useFakeTimers();
    const { container } = render(<SpiderOrnament />);
    const spider = container.querySelector('.event-spider') as HTMLElement;
    fireEvent.click(spider);
    expect(container.querySelector('.event-spider-up')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(container.querySelector('.event-spider-up')).toBeNull();
  });
});
