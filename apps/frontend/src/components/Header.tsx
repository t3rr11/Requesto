import { useUIStore } from '../store/useUIStore';
import { useThemeStore } from '../store/useThemeStore';
import { ListCollapse, Menu, Moon, Sun, Settings, Shield, Send } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';

export const Header = () => {
  const { isSidebarOpen, toggleSidebar, isConsoleOpen, toggleConsole, openHelp } = useUIStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/requests', icon: Send, label: 'Requests', title: 'API Requests' },
    { path: '/environments', icon: Settings, label: 'Environments', title: 'Manage Environments' },
    { path: '/oauth', icon: Shield, label: 'OAuth 2.0', title: 'OAuth 2.0 Settings' },
  ];

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

          {/* Navigation Menu Items */}
          <nav className="flex items-center gap-1 ml-4">
            {navItems.map(({ path, icon: Icon, label, title }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
                  location.pathname === path
                    ? 'bg-blue-500 dark:bg-gray-700'
                    : 'hover:bg-blue-500 dark:hover:bg-gray-700'
                }`}
                title={title}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
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
