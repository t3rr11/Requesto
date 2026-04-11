import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from './Button';

type ContextMenuItem = {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
};

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed flex flex-col z-50 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-45"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {items.map((item, index) => (
        <Button
          key={index}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          variant="ghost"
          size="md"
          className={`w-full justify-start! text-left text-sm rounded-none ${
            item.danger
              ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          {item.icon && <span className="shrink-0">{item.icon}</span>}
          <span>{item.label}</span>
        </Button>
      ))}
    </div>
  );
}
