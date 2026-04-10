import { ReactNode } from 'react';

interface SidebarPanelProps {
  title: string;
  headerActions?: ReactNode;
  isLoading?: boolean;
  children: ReactNode;
}

export const SidebarPanel = ({
  title,
  headerActions,
  isLoading,
  children,
}: SidebarPanelProps) => {
  return (
    <div className="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 min-h-14 flex">
        <div className="flex items-center justify-between w-full">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</h2>
          {headerActions}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
