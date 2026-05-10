import { useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Dialog({ isOpen, onClose, title, children, footer, size = 'md' }: DialogProps) {
  const [visible, setVisible] = useState(false);
  const [animate, setAnimate] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClose = useCallback(() => {
    setAnimate(false);
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }

    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setVisible(false);
      onClose();
    }, 150);
  }, [onClose]);

  // Clear any pending close timers on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimate(true));
      });
      document.body.style.overflow = 'hidden';
    } else {
      setAnimate(false);
      const timer = setTimeout(() => setVisible(false), 150);
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  if (!visible) return null;

  const sizes: Record<NonNullable<DialogProps['size']>, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-150 ease-out ${
        animate ? 'bg-black/40 dark:bg-black/60 backdrop-blur-[2px]' : 'bg-transparent'
      }`}
      onMouseDown={handleClose}
    >
      <div
        ref={dialogRef}
        className={`bg-white dark:bg-gray-800 rounded-xl w-full ${sizes[size]} max-h-[90vh] flex flex-col
          shadow-[0_20px_60px_-12px_rgba(0,0,0,0.25)] dark:shadow-[0_20px_60px_-12px_rgba(0,0,0,0.5)]
          ring-1 ring-black/8 dark:ring-white/8
          transition-all duration-150 ease-out origin-center
          ${animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-[0.97] translate-y-1'}`}
        onMouseDown={e => e.stopPropagation()}
      >
        {title ? (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700/60 shrink-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight">{title}</h2>
            <button
              onClick={handleClose}
              className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-100"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex justify-end px-4 pt-3 shrink-0">
            <button
              onClick={handleClose}
              className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-100"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div className="px-6 py-4 bg-gray-50/80 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-700/60 rounded-b-xl shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

interface DialogFooterProps {
  children: ReactNode;
}

export function DialogFooter({ children }: DialogFooterProps) {
  return <div className="flex justify-end gap-2">{children}</div>;
}
