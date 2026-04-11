import { useRef, useEffect } from 'react';
import { useCollectionsStore } from '../store/collections/store';
import { useRequestStore } from '../store/request/store';
import { useTabsStore } from '../store/tabs/store';
import { useUIStore } from '../store/ui/store';
import { CollectionsSidebar } from '../components/CollectionsSidebar';
import { TabsBar } from '../components/TabsBar';
import { RequestResponseView, type RequestResponseViewHandle } from '../components/RequestResponseView';
import { ConsolePanel } from '../components/ConsolePanel';

export function RequestsPage() {
  const { loadCollections } = useCollectionsStore();
  const { consoleLogs, clearConsoleLogs } = useRequestStore();
  const { openNewTab } = useTabsStore();
  const { isConsoleOpen, consoleHeight, toggleConsole, setConsoleHeight } = useUIStore();
  const requestViewRef = useRef<RequestResponseViewHandle>(null);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  // Keyboard shortcut for new tab
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openNewTab();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openNewTab]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col relative min-h-0 bg-white dark:bg-gray-900">
      <div
        className="flex flex-1 min-h-0 overflow-hidden"
        style={{ paddingBottom: isConsoleOpen ? `${consoleHeight}px` : '40px' }}
      >
        <CollectionsSidebar />
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsBar />
          <RequestResponseView ref={requestViewRef} />
        </div>
      </div>
      <ConsolePanel
        isOpen={isConsoleOpen}
        consoleHeight={consoleHeight}
        consoleLogs={consoleLogs}
        onToggle={toggleConsole}
        onClear={clearConsoleLogs}
        onHeightChange={setConsoleHeight}
      />
    </div>
  );
}
