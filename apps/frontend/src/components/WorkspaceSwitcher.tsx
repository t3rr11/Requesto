import { useState } from 'react';
import { ChevronDown, Settings, Check } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspace/store';

interface WorkspaceSwitcherProps {
  onManageWorkspaces: () => void;
  variant?: 'sidebar' | 'header';
}

export function WorkspaceSwitcher({ onManageWorkspaces, variant = 'sidebar' }: WorkspaceSwitcherProps) {
  const { registry, switchWorkspace } = useWorkspaceStore();
  const [isOpen, setIsOpen] = useState(false);

  const activeWorkspace = registry.workspaces.find(w => w.id === registry.activeWorkspaceId);

  const handleSwitch = async (id: string) => {
    if (id === registry.activeWorkspaceId) {
      setIsOpen(false);
      return;
    }
    try {
      await switchWorkspace(id);
      setIsOpen(false);
      // Reload the page to refresh all data for the new workspace
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch workspace:', error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium transition-colors max-w-45 ${
          variant === 'header'
            ? 'text-white/90 dark:text-gray-300 hover:bg-white/15 dark:hover:bg-gray-700'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        title={activeWorkspace?.name || 'Select workspace'}
      >
        <span className="truncate">{activeWorkspace?.name || 'No workspace'}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1">
            <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Workspaces
            </div>
            <div className="max-h-60 overflow-y-auto">
              {registry.workspaces.map(workspace => (
                <button
                  key={workspace.id}
                  onClick={() => handleSwitch(workspace.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  {workspace.id === registry.activeWorkspaceId ? (
                    <Check className="w-4 h-4 text-blue-500 shrink-0" />
                  ) : (
                    <span className="w-4 h-4 shrink-0" />
                  )}
                  <span className="truncate">{workspace.name}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 mt-1 pt-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onManageWorkspaces();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <Settings className="w-4 h-4 shrink-0" />
                Manage Workspaces...
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
