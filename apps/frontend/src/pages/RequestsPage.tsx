import RequestResponseView from "../components/RequestResponseView";
import { useUIStore } from "../store/useUIStore";
import { CollectionsSidebar } from "../components/CollectionsSidebar";
import { ConsolePanel } from "../components/ConsolePanel";
import { TabsBar } from "../components/TabsBar";

export const RequestPage = () => {
  const { isConsoleOpen, consoleHeight } = useUIStore();

  return (
    <main className="flex-1 overflow-hidden flex relative">
      <CollectionsSidebar />
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ paddingBottom: isConsoleOpen ? `${consoleHeight}px` : '32px' }}
      >
        <TabsBar />
        <RequestResponseView />
      </div>
      <ConsolePanel />
    </main>
  );
};
