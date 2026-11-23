import { useState, useRef, useEffect } from 'react';
import { Braces, ChevronDown, Settings, Check, Search, X, Plus } from 'lucide-react';
import { useEnvironmentStore } from '../store/environments/store';
import { EnvironmentManagerDialog } from '../forms/EnvironmentManagerDialog';
import { NewEnvironmentForm } from '../forms/NewEnvironmentForm';
import { Dialog } from './Dialog';
import { useDialog } from '../hooks/useDialog';

export function EnvironmentSwitcher() {
  const { environmentsData, setActiveEnvironment } = useEnvironmentStore();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showManager, setShowManager] = useState(false);
  const newEnvDialog = useDialog();
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const activeEnv = environmentsData.environments.find(e => e.id === environmentsData.activeEnvironmentId);
  const filtered = environmentsData.environments.filter(env => env.name.toLowerCase().includes(search.toLowerCase()));

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

  const closeDropdown = () => {
    setIsOpen(false);
    setSearch('');
  };

  const handleSelect = (envId: string | null) => {
    void setActiveEnvironment(envId);
    closeDropdown();
  };

  const handleCreateNew = () => {
    closeDropdown();
    newEnvDialog.open();
  };

  const handleOpenManager = () => {
    closeDropdown();
    setShowManager(true);
  };

  const handleNewEnvCreated = async (id: string) => {
    await setActiveEnvironment(id);
    newEnvDialog.close();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        data-testid="environment-switcher"
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium transition-colors max-w-45 text-white/90 dark:text-gray-300 hover:bg-white/15 dark:hover:bg-gray-700"
        title={activeEnv ? `Environment: ${activeEnv.name}` : 'Select environment'}
      >
        <Braces className="w-3.5 h-3.5 shrink-0" />
        <span className={`truncate ${activeEnv ? '' : 'italic text-white/60 dark:text-gray-500'}`}>
          {activeEnv?.name ?? 'No Environment'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1">
          {/* Search */}
          <div className="px-2 py-1">
            <div className="flex items-center gap-1 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm bg-gray-50 dark:bg-gray-700">
              <Search className="w-3 h-3 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search environments..."
                className="flex-1 bg-transparent outline-none text-xs text-gray-700 dark:text-gray-300 py-0.5"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Environments
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 text-center">No matching environments</p>
            ) : (
              <button
                onClick={() => handleSelect(null)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
              >
                {!environmentsData.activeEnvironmentId ? (
                  <Check className="w-4 h-4 text-blue-500 shrink-0" />
                ) : (
                  <span className="w-4 h-4 shrink-0" />
                )}
                <span className={environmentsData.activeEnvironmentId ? 'truncate' : 'truncate font-medium'}>
                  No Environment
                </span>
              </button>
            )}
            {filtered.map(env => (
              <button
                key={env.id}
                onClick={() => handleSelect(env.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
              >
                {env.id === environmentsData.activeEnvironmentId ? (
                  <Check className="w-4 h-4 text-blue-500 shrink-0" />
                ) : (
                  <span className="w-4 h-4 shrink-0" />
                )}
                <span className={env.id === environmentsData.activeEnvironmentId ? 'truncate font-medium' : 'truncate'}>
                  {env.name}
                </span>
              </button>
            ))}
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 mt-1 pt-1">
            <button
              onClick={handleCreateNew}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <Plus className="w-4 h-4 shrink-0" />
              New Environment...
            </button>
            <button
              onClick={handleOpenManager}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <Settings className="w-4 h-4 shrink-0" />
              Manage Environments...
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
