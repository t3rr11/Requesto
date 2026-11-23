import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { useEventTheme } from '../../hooks/useEventTheme';
import type { EventTheme } from '../../events/types';
import { EventHangingOrnament } from '../../components/events/EventHangingOrnament';
import { SpiderOrnament } from '../../components/events/SpiderOrnament';

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
