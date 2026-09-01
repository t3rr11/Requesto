import { ChevronDown, ChevronRight, Package } from 'lucide-react';

interface RunnerCollectionRowProps {
  name: string;
  isCollapsed: boolean;
  onToggle: (collectionId: string) => void;
  collectionId: string;
  isChecked?: boolean;
  onToggleCheck?: (collectionId: string) => void;
}

/** Collapsible group header shown above each collection when running multiple collections. */
export function RunnerCollectionRow({ name, isCollapsed, onToggle, collectionId, isChecked, onToggleCheck }: RunnerCollectionRowProps) {
  return (
    <div
      className="flex items-center gap-2 pt-3 pb-1 mt-1 border-b border-gray-100 dark:border-gray-800 first:pt-0 cursor-pointer select-none group"
      onClick={() => onToggle(collectionId)}
    >
      {onToggleCheck && (
        <input
          type="checkbox"
          checked={isChecked ?? true}
          onChange={() => onToggleCheck(collectionId)}
          onClick={(e) => e.stopPropagation()}
          className="w-3.5 h-3.5 accent-blue-500 shrink-0 cursor-pointer"
          aria-label={`Include ${name} in this run`}
        />
      )}
      {isCollapsed
        ? <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0" />
        : <ChevronDown className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0" />}
      <Package className={`w-3.5 h-3.5 shrink-0 ${isChecked === false ? 'text-gray-300 dark:text-gray-600' : 'text-blue-500'}`} />
      <span className={`text-xs font-semibold uppercase tracking-wide group-hover:text-gray-900 dark:group-hover:text-gray-50 ${
        isChecked === false
          ? 'text-gray-400 dark:text-gray-500 line-through'
          : 'text-gray-700 dark:text-gray-200'
      }`}>
        {name}
      </span>
    </div>
  );
}
