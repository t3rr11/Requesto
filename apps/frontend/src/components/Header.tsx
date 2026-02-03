import { useEffect } from 'react';
import { useUIStore } from '../store/useUIStore';
import { useEnvironmentStore } from '../store/useEnvironmentStore';
import { useThemeStore } from '../store/useThemeStore';
import { ListCollapse, Menu, Moon, Sun, Shield } from 'lucide-react';
import { useNavigate } from 'react-router';

export const Header = () => {
  const { isSidebarOpen, toggleSidebar, isConsoleOpen, toggleConsole, openHelp } = useUIStore();
  const { environmentsData, loadEnvironments, setActiveEnvironment } = useEnvironmentStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadEnvironments();
  }, []);

  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-gray-800 dark:to-gray-800 text-white shadow-lg">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-blue-500 rounded transition-colors"
            title={isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
          >
            {isSidebarOpen ? <Menu className="w-5 h-5" /> : <ListCollapse className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/requests')}>
            <img src="/logo.png" alt="Localman Logo" className="w-8 h-8" />
            <h1 className="text-xl font-bold">Localman</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Environment Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-blue-200">Environment:</label>
            <div className="relative">
              <select
                value={environmentsData.activeEnvironmentId || ''}
                onChange={e => setActiveEnvironment(e.target.value)}
                className="px-3 min-w-32 py-1.5 pr-8 text-sm bg-white/10 text-white rounded-md border border-white/20 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/30 appearance-none cursor-pointer backdrop-blur-sm transition-all"
                style={{
                  colorScheme: 'dark'
                }}
              >
                {environmentsData.environments.length === 0 && (
                  <option value="" className="bg-gray-800 text-white">No environments</option>
                )}
                {environmentsData.environments.map(env => (
                  <option key={env.id} value={env.id} className="bg-gray-800 text-white">
                    {env.name}
                  </option>
                ))}
              </select>
              <svg
                className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-white/70"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <button
              onClick={() => navigate('/environments')}
              className="p-1.5 hover:bg-blue-500 rounded transition-colors"
              title="Manage Environments"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>

          {/* OAuth Settings Button */}
          <button
            onClick={() => navigate('/oauth')}
            className="p-1.5 hover:bg-blue-500 dark:hover:bg-gray-700 rounded transition-colors"
            title="OAuth 2.0 Settings"
          >
            <Shield className="w-5 h-5" />
          </button>

          {/* Help Button */}
          <button
            onClick={openHelp}
            className="p-1.5 hover:bg-blue-500 rounded transition-colors"
            title="Keyboard Shortcuts"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 hover:bg-blue-500 dark:hover:bg-gray-700 rounded transition-colors"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Console Toggle */}
          <button
            onClick={toggleConsole}
            className={`p-1.5 rounded transition-colors ${isConsoleOpen ? 'bg-blue-500 dark:bg-gray-700' : 'hover:bg-blue-500 dark:hover:bg-gray-700'}`}
            title={isConsoleOpen ? 'Hide Console' : 'Show Console'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};
