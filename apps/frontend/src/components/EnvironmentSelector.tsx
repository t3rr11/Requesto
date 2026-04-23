import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, ChevronDown, Plus, Search, Settings } from 'lucide-react';
import { useEnvironmentStore } from '../store/environments/store';
import { EnvironmentManagerDialog } from '../forms/EnvironmentManagerDialog';
import { NewEnvironmentForm } from '../forms/NewEnvironmentForm';
import { Dialog } from './Dialog';
import { useDialog } from '../hooks/useDialog';

/**
 * Simple select-based environment selector (full-width).
 */
export function EnvironmentSelector() {
  const { environmentsData, setActiveEnvironment } = useEnvironmentStore();

  return (
    <select
      value={environmentsData.activeEnvironmentId ?? ''}
      onChange={e => setActiveEnvironment(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">No Environment</option>
      {environmentsData.environments.map(env => (
        <option key={env.id} value={env.id}>
          {env.name}
        </option>
      ))}
    </select>
  );
}

/**
 * Compact dropdown environment selector used in TabsBar.
 */
export function EnvironmentSelectorCompact() {
  const { environmentsData, setActiveEnvironment } = useEnvironmentStore();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showManager, setShowManager] = useState(false);
  const newEnvDialog = useDialog();
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const activeEnv = environmentsData.environments.find(
    e => e.id === environmentsData.activeEnvironmentId,
  );

  const filtered = environmentsData.environments.filter(env =>
    env.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = useCallback(
    (envId: string) => {
      setActiveEnvironment(envId);
      setIsOpen(false);
      setSearch('');
    },
    [setActiveEnvironment],
  );

  const handleCreateNew = useCallback(() => {
    setIsOpen(false);
    setSearch('');
    newEnvDialog.open();
  }, [newEnvDialog]);

  const handleNewEnvCreated = useCallback(
    async (id: string) => {
      await setActiveEnvironment(id);
      newEnvDialog.close();
    },
    [setActiveEnvironment, newEnvDialog],
  );

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) searchRef.current?.focus();
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative flex items-center gap-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center gap-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-w-36"
      >
        <span className={`truncate ${activeEnv ? '' : 'text-gray-400 dark:text-gray-500'}`}>
          {activeEnv?.name ?? 'No Environment'}
        </span>
        <ChevronDown className="w-3 h-3 shrink-0" />
      </button>
      <button
        onClick={() => setShowManager(true)}
        className="flex items-center px-1.5 py-1.25 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title="Manage Environments"
      >
        <Settings className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          <div className="px-2 pb-1">
            <div className="flex items-center gap-1 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm bg-gray-50 dark:bg-gray-700">
              <Search className="w-3 h-3 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="flex-1 bg-transparent outline-none text-xs text-gray-700 dark:text-gray-300"
              />
            </div>
          </div>

          <button
            onClick={() => handleSelect('')}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {!environmentsData.activeEnvironmentId && <Check className="w-3 h-3 text-green-500" />}
            <span className={!environmentsData.activeEnvironmentId ? 'font-medium' : ''}>No Environment</span>
          </button>

          {filtered.map(env => (
            <button
              key={env.id}
              onClick={() => handleSelect(env.id)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {env.id === environmentsData.activeEnvironmentId && (
                <Check className="w-3 h-3 text-green-500" />
              )}
              <span className={env.id === environmentsData.activeEnvironmentId ? 'font-medium' : ''}>
                {env.name}
              </span>
            </button>
          ))}

          <div className="border-t border-gray-200 dark:border-gray-700 mt-1 pt-1">
            <button
              onClick={handleCreateNew}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <Plus className="w-3 h-3" />
              Create New Environment
            </button>
            <button
              onClick={() => { setIsOpen(false); setSearch(''); setShowManager(true); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Settings className="w-3 h-3" />
              Manage Environments
            </button>
          </div>
        </div>
      )}

      <EnvironmentManagerDialog isOpen={showManager} onClose={() => setShowManager(false)} />

      <Dialog isOpen={newEnvDialog.isOpen} onClose={newEnvDialog.close} title="New Environment">
        <NewEnvironmentForm onSuccess={handleNewEnvCreated} onCancel={newEnvDialog.close} />
      </Dialog>
    </div>
  );
}
