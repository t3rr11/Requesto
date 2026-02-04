import RequestResponseView from "../components/RequestResponseView";
import { useUIStore } from "../store/useUIStore";
import { EnvironmentSelector } from "../components/EnvironmentSelector";
import { CollectionsSidebar } from "../components/CollectionsSidebar";
import { ConsolePanel } from "../components/ConsolePanel";
import { TabsBar } from "../components/TabsBar";

export const RequestPage = () => {
  const { isConsoleOpen, consoleHeight, isSidebarOpen } = useUIStore();

  return (
    <main className="flex-1 overflow-hidden flex relative min-h-0 bg-white dark:bg-gray-900">
      {isSidebarOpen && (
        <div className="flex flex-col h-full dark:border-gray-700 dark:border-t dark:border-t-gray-700">
          <EnvironmentSelector />
          <CollectionsSidebar />
        </div>
      )}
      <div
        className="flex-1 flex flex-col overflow-hidden min-h-0 bg-white dark:bg-gray-900"
        style={{ paddingBottom: isConsoleOpen ? `${consoleHeight}px` : '32px' }}
      >
        <TabsBar />
        <RequestResponseView />
      </div>
      <ConsolePanel />
    </main>
  );
};
