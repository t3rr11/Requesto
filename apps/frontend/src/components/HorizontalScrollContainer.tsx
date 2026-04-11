import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface HorizontalScrollContainerProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  showScrollbar?: boolean;
}

export function HorizontalScrollContainer({
  children,
  className = '',
  contentClassName = '',
  showScrollbar = false,
}: HorizontalScrollContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  const checkScrollButtons = () => {
    const container = containerRef.current;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftScroll(scrollLeft > 0);
    setShowRightScroll(scrollLeft + clientWidth < scrollWidth - 1);
  };

  useEffect(() => {
    checkScrollButtons();
    const container = containerRef.current;
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
  }, [children]);

  const handleScroll = (direction: 'left' | 'right') => {
    const container = containerRef.current;
    if (!container) return;
    const offset = direction === 'left' ? -200 : 200;
    container.scrollTo({ left: container.scrollLeft + offset, behavior: 'smooth' });
  };

  useEffect(() => {
    const container = containerRef.current;
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
    <div className={`relative ${className}`}>
      {showLeftScroll && (
        <Button
          onClick={() => handleScroll('left')}
          variant="icon"
          size="md"
          className="absolute left-0 z-10 h-full rounded-none bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-r border-gray-300 dark:border-gray-600 shadow-[4px_0_8px_rgba(0,0,0,0.1)]"
          aria-label="Scroll left"
        >
          <ChevronLeft size={16} className="text-gray-600 dark:text-gray-400" />
        </Button>
      )}

      <div
        ref={containerRef}
        className={`overflow-x-auto overflow-y-hidden ${!showScrollbar ? 'scrollbar-hide' : ''} ${contentClassName}`}
        style={!showScrollbar ? { scrollbarWidth: 'none', msOverflowStyle: 'none' } : undefined}
      >
        {children}
      </div>

      {showRightScroll && (
        <Button
          onClick={() => handleScroll('right')}
          variant="icon"
          size="md"
          className="absolute right-0 z-10 h-full rounded-none bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-l border-gray-300 dark:border-gray-600 shadow-[-4px_0_8px_rgba(0,0,0,0.1)]"
          aria-label="Scroll right"
        >
          <ChevronRight size={16} className="text-gray-600 dark:text-gray-400" />
        </Button>
      )}
    </div>
  );
}
