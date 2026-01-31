import { CollectionsSidebar } from '../CollectionsSidebar';
import { ConsolePanel } from '../ConsolePanel';
import { MainContentArea } from './MainContentArea';

export const MainLayout = () => {
  return (
    <main className="flex-1 overflow-hidden flex relative">
      <CollectionsSidebar />
      <MainContentArea />
      <ConsolePanel />
    </main>
  );
};
