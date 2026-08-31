import { ChevronDown, ChevronRight, Package } from 'lucide-react';

interface RunnerCollectionRowProps {
  name: string;
  isCollapsed: boolean;
  onToggle: (collectionId: string) => void;
  collectionId: string;
}

/** Collapsible group header shown above each collection when running multiple collections. */
export function RunnerCollectionRow({ name, isCollapsed, onToggle, collectionId }: RunnerCollectionRowProps) {
  return (
    <div
      className="flex items-center gap-2 pt-3 pb-1 mt-1 border-b border-gray-100 dark:border-gray-800 first:pt-0 cursor-pointer select-none group"
      onClick={() => onToggle(collectionId)}
    >
      {isCollapsed
        ? <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0" />
        : <ChevronDown className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0" />}
      <Package className="w-3.5 h-3.5 text-blue-500 shrink-0" />
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide group-hover:text-gray-900 dark:group-hover:text-gray-50">
        {name}
      </span>
    </div>
  );
}
