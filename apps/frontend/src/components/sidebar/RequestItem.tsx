import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, Check } from 'lucide-react';
import type { SavedRequest } from '../../store/collections/types';
import { MethodBadge } from './MethodBadge';

export interface RequestItemProps {
  request: SavedRequest;
  collectionId: string;
  isActive: boolean;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

export function RequestItem({
  request,
  collectionId,
  isActive,
  isSelected,
  onSelect,
  onContextMenu,
  onDelete,
}: RequestItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: request.id,
    data: {
      type: 'request',
      collectionId,
      folderId: request.folderId,
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    userSelect: 'none',
  };

  const isHighlighted = isActive || isSelected;

  // Selected (multi-pick) gets a stronger tint + always-visible check icon so it
  // looks clearly different from the "just open in a tab" active state.
  const rowClass = isSelected
    ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-500'
    : isActive
    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400'
    : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/60';

  return (
    <div
      ref={setNodeRef}
      data-request-item
      className={`py-1.5 pl-5 pr-3 cursor-pointer flex items-center justify-between group transition-colors border-l-2 ${rowClass}`}
      style={style}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0 pointer-events-none">
        <MethodBadge method={request.method} />
        <span
          className={`text-sm truncate ${
            isHighlighted
              ? 'text-gray-900 dark:text-gray-50 font-medium'
              : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          {request.name}
        </span>
      </div>
      {isSelected ? (
        <Check className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0 pointer-events-none" />
      ) : (
        <button
          onClick={onDelete}
          onPointerDown={e => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-opacity shrink-0"
          title="Delete Request"
        >
          <Trash2 className="w-3 h-3 text-gray-400 dark:text-gray-500" />
        </button>
      )}
    </div>
  );
}
