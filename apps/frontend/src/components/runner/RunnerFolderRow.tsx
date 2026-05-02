import { ChevronDown, ChevronRight, Folder as FolderIcon } from 'lucide-react';
import type { Folder } from '../../store/collections/types';

interface RunnerFolderRowProps {
  folder: Folder;
  depth: number;
  isCollapsed: boolean;
  onToggle: (id: string) => void;
}

export function RunnerFolderRow({ folder, depth, isCollapsed, onToggle }: RunnerFolderRowProps) {
  return (
    <div
      className="flex items-center gap-2 py-1.5 mt-1 cursor-pointer select-none group"
      style={{ paddingLeft: `${12 + depth * 16}px` }}
      onClick={() => onToggle(folder.id)}
    >
      {isCollapsed
        ? <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0" />
        : <ChevronDown className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0" />}
      <FolderIcon className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-500 shrink-0" />
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide group-hover:text-gray-700 dark:group-hover:text-gray-200">
        {folder.name}
      </span>
    </div>
  );
}
