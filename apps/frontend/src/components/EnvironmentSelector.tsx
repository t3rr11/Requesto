import { useEffect, useState, useRef } from 'react';
import { ChevronDown, Search, Plus, Check } from 'lucide-react';
import { useEnvironmentStore } from '../store/environments';
import { useNavigate } from 'react-router';

export const EnvironmentSelector = () => {
  const { environmentsData, loadEnvironments, setActiveEnvironment } = useEnvironmentStore();

  useEffect(() => {
    loadEnvironments();
  }, []);

  return (
    <div className="p-4 border-b border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">
        Environment
      </label>
      <div className="relative">
        <select
          value={environmentsData.activeEnvironmentId || ''}
          onChange={e => setActiveEnvironment(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 appearance-none cursor-pointer transition-all"
        >
          {environmentsData.environments.length === 0 && (
            <option value="" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              No environments
            </option>
          )}
          {environmentsData.environments.map(env => (
            <option key={env.id} value={env.id} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              {env.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-500 dark:text-gray-400" />
      </div>
    </div>
  );
};

export const EnvironmentSelectorCompact = () => {
  const { environmentsData, loadEnvironments, setActiveEnvironment, saveEnvironment } = useEnvironmentStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadEnvironments();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const activeEnv = environmentsData.environments.find(
    env => env.id === environmentsData.activeEnvironmentId
  );

  const filteredEnvironments = environmentsData.environments.filter(env =>
    env.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (id: string) => {
    setActiveEnvironment(id);
    setIsOpen(false);
    setSearch('');
  };

  const handleCreateNew = async () => {
    const name = search.trim() || 'New Environment';
    const newEnv = {
      id: crypto.randomUUID(),
      name,
      variables: [],
    };
    await saveEnvironment(newEnv);
    await setActiveEnvironment(newEnv.id);
    setIsOpen(false);
    setSearch('');
    navigate('/environments');
  };

  return (
    <div ref={dropdownRef} className="flex-shrink-0 flex items-center h-full border-l border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-full pl-3 pr-7 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-all min-w-[160px] text-left relative"
      >
        <span className="truncate">{activeEnv?.name || 'No Environment'}</span>
        <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-0.5 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-50 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                    setSearch('');
                  }
                }}
                placeholder="Search environments..."
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>

          {/* Environment list */}
          <div className="max-h-48 overflow-y-auto py-1">
            {filteredEnvironments.length === 0 && !search && (
              <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 text-center">No environments</div>
            )}
            {filteredEnvironments.length === 0 && search && (
              <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 text-center">No matches</div>
            )}
            {filteredEnvironments.map(env => (
              <button
                key={env.id}
                onClick={() => handleSelect(env.id)}
                className="w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 transition-colors"
              >
                <span className="w-4 flex-shrink-0">
                  {env.id === environmentsData.activeEnvironmentId && (
                    <Check className="w-3.5 h-3.5 text-blue-500" />
                  )}
                </span>
                <span className="truncate">{env.name}</span>
              </button>
            ))}
          </div>

          {/* Create new */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-1">
            <button
              onClick={handleCreateNew}
              className="w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 transition-colors rounded"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{search.trim() ? `Create "${search.trim()}"` : 'Create new environment'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
