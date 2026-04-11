import { useUIStore } from '../store/ui/store';
import { useThemeStore } from '../store/theme/store';
import { useDialog } from '../hooks/useDialog';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { HelpContent } from './HelpContent';
import { Moon, Sun, Columns2, Rows2, Terminal, HelpCircle, PanelLeftClose } from 'lucide-react';

export function Header() {
  const { isSidebarOpen, toggleSidebar, isConsoleOpen, toggleConsole, panelLayout, togglePanelLayout } = useUIStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const helpDialog = useDialog();

  return (
    <header className="bg-linear-to-r from-blue-600 to-blue-700 dark:from-gray-800 dark:to-gray-800 text-white shadow-lg border-b border-gray-300 dark:border-gray-700">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Button
            onClick={toggleSidebar}
            variant="icon"
            size="md"
            className="text-white hover:bg-blue-500! dark:hover:bg-gray-700! hover:text-white!"
            title={isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
          >
            <PanelLeftClose className={`w-5 h-5 ${isSidebarOpen ? '' : 'rotate-180'}`} />
          </Button>

          <div className="flex items-center gap-3">
            <img src="./logo.png" alt="Requesto Logo" className="w-8 h-8" />
            <h1 className="text-xl font-bold">Requesto</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={helpDialog.open}
            variant="icon"
            size="sm"
            title="Help"
            className="text-white hover:bg-blue-500! dark:hover:bg-gray-700! hover:text-white!"
          >
            <HelpCircle className="w-5 h-5" />
          </Button>
          <Button
            onClick={toggleTheme}
            variant="icon"
            size="sm"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="text-white hover:bg-blue-500! dark:hover:bg-gray-700! hover:text-white!"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          <Button
            onClick={togglePanelLayout}
            variant="icon"
            size="sm"
            title={panelLayout === 'horizontal' ? 'Switch to Vertical Layout' : 'Switch to Horizontal Layout'}
            className="text-white hover:bg-blue-500! dark:hover:bg-gray-700! hover:text-white!"
          >
            {panelLayout === 'horizontal' ? <Rows2 className="w-5 h-5" /> : <Columns2 className="w-5 h-5" />}
          </Button>
          <Button
            onClick={toggleConsole}
            variant="icon"
            size="sm"
            title={isConsoleOpen ? 'Hide Console' : 'Show Console'}
            className={`text-white hover:text-white! ${isConsoleOpen ? 'bg-blue-500 dark:bg-gray-700' : 'hover:bg-blue-500! dark:hover:bg-gray-700!'}`}
          >
            <Terminal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <Dialog isOpen={helpDialog.isOpen} onClose={helpDialog.close} title="Help">
        <HelpContent onClose={helpDialog.close} />
      </Dialog>
    </header>
  );
}
