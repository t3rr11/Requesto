import RequestResponseView from '../RequestResponseView';
import { TabsBar } from '../TabsBar';
import { useUIStore } from '../../store/useUIStore';

export const MainContentArea = () => {
  const { isConsoleOpen, consoleHeight } = useUIStore();

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      style={{ paddingBottom: isConsoleOpen ? `${consoleHeight}px` : '32px' }}
    >
      <TabsBar />
      <RequestResponseView />
    </div>
  );
};
