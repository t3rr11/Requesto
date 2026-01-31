import { useEffect, useRef, useState, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HorizontalScrollContainerProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  showScrollbar?: boolean;
}

export const HorizontalScrollContainer = ({
  children,
  className = '',
  contentClassName = '',
  showScrollbar = false,
}: HorizontalScrollContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  // Check if scrolling is needed and update scroll button visibility
  const checkScrollButtons = () => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftScroll(scrollLeft > 0);
    setShowRightScroll(scrollLeft + clientWidth < scrollWidth - 1);
  };

  // Check scroll buttons on mount and when content changes
  useEffect(() => {
    checkScrollButtons();
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', checkScrollButtons);
    window.addEventListener('resize', checkScrollButtons);

    // Use ResizeObserver to detect content size changes
    const resizeObserver = new ResizeObserver(checkScrollButtons);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', checkScrollButtons);
      window.removeEventListener('resize', checkScrollButtons);
      resizeObserver.disconnect();
    };
  }, [children]);

  const scrollContent = (direction: 'left' | 'right') => {
    const container = containerRef.current;
    if (!container) return;

    const scrollAmount = 200;
    const newScrollLeft =
      direction === 'left' ? container.scrollLeft - scrollAmount : container.scrollLeft + scrollAmount;

    container.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
  };

  // Handle wheel scroll for horizontal scrolling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Only handle horizontal scroll if there's horizontal overflow
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
      {/* Left scroll button */}
      {showLeftScroll && (
        <button
          onClick={() => scrollContent('left')}
          className="absolute left-0 z-10 h-full px-3 bg-gray-50 hover:bg-gray-100 transition-colors border-r border-gray-300 shadow-[4px_0_8px_rgba(0,0,0,0.1)]"
          aria-label="Scroll left"
        >
          <ChevronLeft size={16} className="text-gray-600" />
        </button>
      )}

      {/* Scrollable content */}
      <div
        ref={containerRef}
        className={`overflow-x-auto overflow-y-hidden ${!showScrollbar ? 'scrollbar-hide' : ''} ${contentClassName}`}
        style={
          !showScrollbar
            ? {
                scrollbarWidth: 'none', // Firefox
                msOverflowStyle: 'none', // IE/Edge
              }
            : undefined
        }
      >
        {children}
      </div>

      {/* Right scroll button */}
      {showRightScroll && (
        <button
          onClick={() => scrollContent('right')}
          className="absolute right-0 z-10 h-full px-3 bg-gray-50 hover:bg-gray-100 transition-colors border-l border-gray-300 shadow-[-4px_0_8px_rgba(0,0,0,0.1)]"
          aria-label="Scroll right"
        >
          <ChevronRight size={16} className="text-gray-600" />
        </button>
      )}
    </div>
  );
};
