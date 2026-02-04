import { useEffect } from 'react';
import { useEnvironmentStore } from '../store/useEnvironmentStore';

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
        <svg
          className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-500 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
};
