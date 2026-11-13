import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  children: ReactNode;
  className?: string;
}

const GAP = 8;
const MARGIN = 8;

type TooltipPlacement = {
  x: number;
  y: number;
  above: boolean;
};

export function Tooltip({ content, children, className }: Readonly<TooltipProps>) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [placement, setPlacement] = useState<TooltipPlacement | null>(null);

  const show = () => {
    if (!content) return;
    const trigger = triggerRef.current?.getBoundingClientRect();
    if (!trigger) return;
    setPlacement({ x: trigger.left + trigger.width / 2, y: trigger.bottom, above: false });
  };
  const hide = () => setPlacement(null);

  // EXPLAIN: clamp to the viewport and flip above the trigger when there is
  // no room below (the rail hugs the window's right edge).
  useLayoutEffect(() => {
    if (!placement || !tooltipRef.current) return;
    const rect = tooltipRef.current.getBoundingClientRect();
    const x = Math.min(
      Math.max(placement.x, MARGIN + rect.width / 2),
      window.innerWidth - MARGIN - rect.width / 2,
    );
    const roomBelow = placement.y + rect.height <= window.innerHeight - MARGIN;
    if (x === placement.x && roomBelow) return;
    if (roomBelow) {
      setPlacement(prev => (prev ? { ...prev, x } : prev));
      return;
    }
    const trigger = triggerRef.current?.getBoundingClientRect();
    if (trigger) setPlacement({ x, y: trigger.top, above: true });
  }, [placement]);

  return (
    <span
      ref={triggerRef}
      className={`relative inline-flex ${className ?? ''}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {placement &&
        // GOTCHA: fixed is relative to the nearest transformed ancestor (the dialog panel has one); portal to the body to escape it.
        createPortal(
          <span
            ref={tooltipRef}
            role="tooltip"
            className="pointer-events-none fixed z-50 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow-lg dark:bg-gray-100 dark:text-gray-900"
            style={{
              left: placement.x,
              top: placement.y,
              marginTop: placement.above ? -GAP : GAP,
              transform: placement.above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            }}
          >
            {content}
          </span>,
          document.body,
        )}
    </span>
  );
}
