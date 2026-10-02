import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface TabStripTab {
  key: string;
  label: ReactNode;
}

interface TabStripProps {
  tabs: TabStripTab[];
  activeKey: string;
  onSelect: (key: string) => void;
  trailing?: ReactNode;
  actions?: ReactNode;
  ariaLabel?: string;
}

export function TabStrip({ tabs, activeKey, onSelect, trailing, actions, ariaLabel }: Readonly<TabStripProps>) {
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  const checkScrollButtons = () => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftScroll(scrollLeft > 0);
    setShowRightScroll(scrollLeft + clientWidth < scrollWidth - 1);
  };

  useEffect(() => {
    checkScrollButtons();
    const container = tabsContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', checkScrollButtons);
    window.addEventListener('resize', checkScrollButtons);

    const resizeObserver = new ResizeObserver(checkScrollButtons);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', checkScrollButtons);
      window.removeEventListener('resize', checkScrollButtons);
      resizeObserver.disconnect();
    };
  }, []);

  const scrollTabs = (direction: 'left' | 'right') => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const scrollAmount = 100;
    const newScrollLeft =
      direction === 'left' ? container.scrollLeft - scrollAmount : container.scrollLeft + scrollAmount;

    container.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
  };

  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (container.scrollWidth > container.clientWidth) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 relative h-11 shrink-0 flex">
      <div className="relative flex-1 min-w-0">
        {showLeftScroll && (
          <Button
            onClick={() => scrollTabs('left')}
            variant="ghost"
            size="sm"
            className="absolute left-0 top-0 z-10 h-full px-3 rounded-none bg-gray-100 dark:bg-gray-700 border-r border-gray-300 dark:border-gray-600 shadow-[4px_0_8px_rgba(0,0,0,0.1)] dark:shadow-[4px_0_8px_rgba(0,0,0,0.3)]"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </Button>
        )}

        <div
          ref={tabsContainerRef}
          className="flex px-3 h-full overflow-x-auto overflow-y-hidden scrollbar-hide"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          role="tablist"
          aria-label={ariaLabel}
        >
          {tabs.map(tab => (
            <Button
              key={tab.key}
              onClick={() => onSelect(tab.key)}
              variant="ghost"
              size="sm"
              role="tab"
              aria-selected={activeKey === tab.key}
              className={`shrink-0 rounded-none border-b-2 transition-colors ${
                activeKey === tab.key
                  ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </Button>
          ))}
          {trailing}
        </div>

        {showRightScroll && (
          <Button
            onClick={() => scrollTabs('right')}
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 z-10 h-full px-3 rounded-none bg-gray-100 dark:bg-gray-700 border-l border-gray-300 dark:border-gray-600 shadow-[-4px_0_8px_rgba(0,0,0,0.1)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.3)]"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </Button>
        )}
      </div>

      {actions && <div className="flex items-center pr-2 shrink-0">{actions}</div>}
    </div>
  );
}
