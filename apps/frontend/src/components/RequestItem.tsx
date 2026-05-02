import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2 } from 'lucide-react';
import type { SavedRequest } from '../store/collections/types';
import { getMethodColor } from '../helpers/collections';

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

  return (
    <div
      ref={setNodeRef}
      data-request-item
      className={`py-2 pl-3 pr-4 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer flex items-center justify-between group ${
        isActive || isSelected ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : ''
      }`}
      style={style}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0 pointer-events-none">
        <span className={`text-xs font-medium ${getMethodColor(request.method)}`}>
          {request.method}
        </span>
        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{request.name}</span>
      </div>
      <button
        onClick={onDelete}
        onPointerDown={e => e.stopPropagation()}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        title="Delete Request"
      >
        <Trash2 className="w-3 h-3 text-gray-500 dark:text-gray-400" />
      </button>
    </div>
  );
}
