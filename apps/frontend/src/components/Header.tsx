import { useUIStore } from '../store/ui';
import { useThemeStore } from '../store/theme';
import { ListCollapse, Menu, Moon, Sun, Settings, Shield, Send, HelpCircle, Terminal, Columns2, Rows2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { HelpContent } from './HelpContent';
import { useDialog } from '../hooks/useDialog';

export const Header = () => {
  const { isSidebarOpen, toggleSidebar, isConsoleOpen, toggleConsole, panelLayout, togglePanelLayout } = useUIStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const helpDialog = useDialog();

  const navItems = [
    { path: '/requests', icon: Send, label: 'Requests', title: 'API Requests' },
    { path: '/environments', icon: Settings, label: 'Environments', title: 'Manage Environments' },
    { path: '/oauth', icon: Shield, label: 'OAuth 2.0', title: 'OAuth 2.0 Settings' },
  ];

  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-gray-800 dark:to-gray-800 text-white shadow-lg">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Button
            onClick={toggleSidebar}
            variant="icon"
            size="md"
            className="text-white hover:!bg-blue-500 dark:hover:!bg-gray-700 hover:!text-white"
            title={isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
          >
            {isSidebarOpen ? <Menu className="w-5 h-5" /> : <ListCollapse className="w-5 h-5" />}
          </Button>

          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/requests')}>
            <img src="./logo.png" alt="Requesto Logo" className="w-8 h-8" />
            <h1 className="text-xl font-bold">Requesto</h1>
          </div>

          <nav className="flex items-center gap-1 ml-4">
            {navItems.map(({ path, icon: Icon, label, title }) => (
              <Button
                key={path}
                onClick={() => navigate(path)}
                variant="ghost"
                size="sm"
                className={`text-white hover:!text-white hover:!bg-blue-500 dark:hover:!bg-gray-700 ${
                  location.pathname === path
                    && 'bg-blue-500 dark:bg-gray-700'
                }`}
                title={title}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={helpDialog.open}
            variant="icon"
            size="sm"
            className="text-white hover:!bg-blue-500 dark:hover:!bg-gray-700 hover:!text-white"
            title="Keyboard Shortcuts"
          >
            <HelpCircle className="w-5 h-5" />
          </Button>

          <Button
            onClick={toggleTheme}
            variant="icon"
            size="sm"
            className="text-white hover:!bg-blue-500 dark:hover:!bg-gray-700 hover:!text-white"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>

          <Button
            onClick={togglePanelLayout}
            variant="icon"
            size="sm"
            className="text-white hover:!bg-blue-500 dark:hover:!bg-gray-700 hover:!text-white"
            title={panelLayout === 'horizontal' ? 'Switch to Vertical Layout' : 'Switch to Horizontal Layout'}
          >
            {panelLayout === 'horizontal' ? <Rows2 className="w-5 h-5" /> : <Columns2 className="w-5 h-5" />}
          </Button>

          <Button
            onClick={toggleConsole}
            variant="icon"
            size="sm"
            className={`text-white hover:!text-white ${isConsoleOpen ? 'bg-blue-500 dark:bg-gray-700' : 'hover:!bg-blue-500 dark:hover:!bg-gray-700'}`}
            title={isConsoleOpen ? 'Hide Console' : 'Show Console'}
          >
            <Terminal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <Dialog isOpen={helpDialog.isOpen} onClose={helpDialog.close} title="Help" size="md">
        <HelpContent onClose={helpDialog.close} />
      </Dialog>
    </header>
  );
};
