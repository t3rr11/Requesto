import { useState, useEffect, useCallback, type RefObject } from 'react';

export type UseResizablePanelResult = {
  isResizing: boolean;
  handleResizeStart: (e: React.MouseEvent) => void;
};

interface UseResizablePanelOptions {
  containerRef: RefObject<HTMLElement | null>;
  axis: 'horizontal' | 'vertical'; // Resize along width (horizontal) or height (vertical)
  onResize: (size: number) => void;
  min: number;
  max: number | ((containerSize: number) => number);
  origin?: 'start' | 'end'; // Whether the resize handle is at the start (left/top) or end (right/bottom) of the panel
}

/**
 * Generic drag-to-resize hook. Attach `handleResizeStart` to a resize handle's
 * `onMouseDown` and the hook manages the drag lifecycle via document-level events.
 */
export function useResizablePanel({
  containerRef,
  axis,
  onResize,
  min,
  max,
  origin = 'start',
}: UseResizablePanelOptions): UseResizablePanelResult {
  const [isResizing, setIsResizing] = useState(false);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      let newSize: number;
      if (axis === 'horizontal') {
        newSize = origin === 'end' ? rect.right - e.clientX : e.clientX - rect.left;
      } else {
        newSize = origin === 'end' ? rect.bottom - e.clientY : e.clientY - rect.top;
      }

      const containerDimension = axis === 'horizontal' ? rect.width : rect.height;
      const maxValue = typeof max === 'function' ? max(containerDimension) : max;
      onResize(Math.max(min, Math.min(newSize, maxValue)));
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, axis, containerRef, onResize, min, max, origin]);

  return { isResizing, handleResizeStart };
}
