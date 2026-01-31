import { useRef } from 'react';
import ResponseViewer from '../ResponseViewer';
import RequestBuilder, { type RequestBuilderRef } from '../RequestBuilder';
import { CollectionsSidebar } from '../CollectionsSidebar';
import { ConsolePanel } from '../ConsolePanel';
import { useUIStore } from '../../store/useUIStore';
import { useRequestStore } from '../../store/useRequestStore';

export const MainLayout = () => {
  const { isConsoleOpen, consoleHeight } = useUIStore();
  const { response, loading, error } = useRequestStore();
  const requestBuilderRef = useRef<RequestBuilderRef>(null);

  return (
    <main className="flex-1 overflow-hidden flex relative">
      {/* Left Sidebar - Collections */}
      <CollectionsSidebar />

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ paddingBottom: isConsoleOpen ? `${consoleHeight}px` : '32px' }}
      >
        <div className="flex-1 flex flex-col overflow-auto">
          <RequestBuilder ref={requestBuilderRef} loading={loading} />

          {error && (
            <div className="bg-red-50 border-t border-b border-red-200 text-red-700 px-4 py-3">
              {error}
            </div>
          )}

          {response && <ResponseViewer response={response} />}
        </div>
      </div>

      {/* Bottom Console Panel */}
      <ConsolePanel />
    </main>
  );
};
