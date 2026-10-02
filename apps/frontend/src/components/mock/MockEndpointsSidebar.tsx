import { useMemo, useRef, useState } from 'react';
import { Search, X, Plus, Trash2, Copy, Pencil, Eye, EyeOff } from 'lucide-react';
import { Button } from '../Button';
import { Dialog } from '../Dialog';
import { ConfirmDialog } from '../ConfirmDialog';
import { ContextMenu } from '../ContextMenu';
import { NewMockEndpointForm } from '../../forms/NewMockEndpointForm';
import { MockModeBadge } from './MockModeBadge';
import { useMockStore } from '../../store/mock/store';
import { useUIStore } from '../../store/ui/store';
import { useAlertStore } from '../../store/alert/store';
import { useResizablePanel } from '../../hooks/useResizablePanel';
import type { MockEndpoint } from '../../store/mock/types';

interface MockEndpointItemProps {
  endpoint: MockEndpoint;
  isActive: boolean;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, endpoint: MockEndpoint) => void;
  onDelete: (endpoint: MockEndpoint) => void;
}

function MockEndpointItem({ endpoint, isActive, onSelect, onContextMenu, onDelete }: Readonly<MockEndpointItemProps>) {
  return (
    <button
      className={`py-1.5 pl-4 pr-3 cursor-pointer flex items-center justify-between group transition-colors border-l-2 w-full ${
        isActive
          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400'
          : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/60'
      } ${endpoint.enabled ? '' : 'opacity-50'}`}
      onClick={() => onSelect(endpoint.id)}
      onContextMenu={e => onContextMenu(e, endpoint)}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0 pointer-events-none">
        <MockModeBadge mode={endpoint.mode} />
        <div className="min-w-0">
          <span
            className={`block text-sm truncate ${
              isActive ? 'text-gray-900 dark:text-gray-50 font-medium' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {endpoint.name}
          </span>
          <span className="block text-xs text-gray-400 dark:text-gray-500 truncate font-mono">{endpoint.path}</span>
        </div>
      </div>
      <button
        onClick={e => {
          e.stopPropagation();
          onDelete(endpoint);
        }}
        onPointerDown={e => e.stopPropagation()}
        tabIndex={-1}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-opacity shrink-0"
        title="Delete Endpoint"
        data-testid={`mock-endpoint-delete-${endpoint.id}`}
      >
        <Trash2 className="w-3 h-3 text-gray-400 dark:text-gray-500" />
      </button>
    </button>
  );
}

export function MockEndpointsSidebar() {
  const {
    endpoints,
    selectedEndpointId,
    selectEndpoint,
    deleteEndpoint,
    duplicateEndpoint,
    clearEndpointData,
    refreshDatasetCount,
    updateEndpoint,
  } = useMockStore();
  const { isSidebarOpen, sidebarWidth, setSidebarWidth } = useUIStore();
  const { showAlert } = useAlertStore();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MockEndpoint | null>(null);
  const [pendingClear, setPendingClear] = useState<MockEndpoint | null>(null);
  const [contextMenuState, setContextMenuState] = useState<{ x: number; y: number; endpoint: MockEndpoint } | null>(
    null
  );

  // Same sizing/toggling behaviour as the collections sidebar
  const { handleResizeStart } = useResizablePanel({
    containerRef: sidebarRef,
    axis: 'horizontal',
    onResize: setSidebarWidth,
    min: 200,
    max: 600,
  });

  const filteredEndpoints = useMemo(() => {
    if (!searchQuery.trim()) return endpoints;
    const query = searchQuery.toLowerCase();
    return endpoints.filter(e => e.name.toLowerCase().includes(query) || e.path.toLowerCase().includes(query));
  }, [endpoints, searchQuery]);

  const handleContextMenu = (e: React.MouseEvent, endpoint: MockEndpoint) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuState({ x: e.clientX, y: e.clientY, endpoint });
  };

  const handleToggleEnabled = async (endpoint: MockEndpoint) => {
    const success = await updateEndpoint(endpoint.id, { enabled: !endpoint.enabled });
    if (success) {
      showAlert('Mock Server', `Endpoint ${endpoint.enabled ? 'disabled' : 'enabled'}`, 'success');
    }
  };

  const handleDuplicate = async (endpoint: MockEndpoint) => {
    const success = await duplicateEndpoint(endpoint.id);
    if (success) {
      showAlert('Success', 'Endpoint duplicated', 'success');
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const success = await deleteEndpoint(pendingDelete.id);
    setPendingDelete(null);
    if (success) {
      showAlert('Success', 'Endpoint deleted', 'success');
    }
  };

  const confirmClear = async () => {
    if (!pendingClear) return;
    const success = await clearEndpointData(pendingClear.id);
    setPendingClear(null);
    if (success) {
      await refreshDatasetCount(pendingClear.id);
      showAlert('Success', 'Data cleared', 'success');
    }
  };

  const contextMenuItems = contextMenuState
    ? [
        {
          label: 'Open',
          icon: <Pencil className="w-4 h-4" />,
          onClick: () => selectEndpoint(contextMenuState.endpoint.id),
        },
        {
          label: contextMenuState.endpoint.enabled ? 'Disable' : 'Enable',
          icon: contextMenuState.endpoint.enabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />,
          onClick: () => handleToggleEnabled(contextMenuState.endpoint),
        },
        {
          label: 'Duplicate',
          icon: <Copy className="w-4 h-4" />,
          onClick: () => handleDuplicate(contextMenuState.endpoint),
        },
        ...(contextMenuState.endpoint.mode === 'dynamic'
          ? [
              {
                label: 'Clear Data',
                icon: <Trash2 className="w-4 h-4" />,
                onClick: () => setPendingClear(contextMenuState.endpoint),
              },
            ]
          : []),
        {
          label: 'Delete',
          icon: <Trash2 className="w-4 h-4" />,
          onClick: () => setPendingDelete(contextMenuState.endpoint),
          danger: true,
        },
      ]
    : [];

  if (!isSidebarOpen || endpoints.length === 0) return null;

  return (
    <div
      ref={sidebarRef}
      className="bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col relative flex-none min-h-0"
      style={{ width: `${sidebarWidth}px` }}
    >
      <div className="px-4 pb-4 pt-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Endpoints</h2>
          <Button onClick={() => setIsNewDialogOpen(true)} variant="icon" size="md" title="New Endpoint">
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search endpoints..."
            className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <X className="w-3 h-3 text-gray-400 dark:text-gray-500" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {endpoints.length > 0 && filteredEndpoints.length === 0 && (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <Search className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-sm">No matching results</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try a different search term</p>
          </div>
        )}
        {endpoints.length > 0 && filteredEndpoints.length > 0 && (
          <div className="py-2">
            {filteredEndpoints.map(endpoint => (
              <MockEndpointItem
                key={endpoint.id}
                endpoint={endpoint}
                isActive={endpoint.id === selectedEndpointId}
                onSelect={selectEndpoint}
                onContextMenu={handleContextMenu}
                onDelete={setPendingDelete}
              />
            ))}
          </div>
        )}
      </div>

      {contextMenuState && (
        <ContextMenu
          items={contextMenuItems}
          position={{ x: contextMenuState.x, y: contextMenuState.y }}
          onClose={() => setContextMenuState(null)}
        />
      )}

      <Dialog isOpen={isNewDialogOpen} onClose={() => setIsNewDialogOpen(false)} title="New Mock Endpoint">
        <NewMockEndpointForm onSuccess={() => setIsNewDialogOpen(false)} onCancel={() => setIsNewDialogOpen(false)} />
      </Dialog>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Endpoint"
        message={`Delete "${pendingDelete?.name ?? ''}" and its mock data? This cannot be undone.`}
        confirmText="Delete"
      />

      <ConfirmDialog
        isOpen={pendingClear !== null}
        onClose={() => setPendingClear(null)}
        onConfirm={confirmClear}
        title="Clear Data"
        message={`Clear all records for "${pendingClear?.name ?? ''}"? Frontend requests will create new ones on demand.`}
        confirmText="Clear"
        variant="warning"
      />

      <button
        tabIndex={-1}
        className="absolute top-0 right-0 w-1 h-full bg-gray-200 dark:bg-gray-700 hover:bg-orange-500 cursor-ew-resize! transition-colors"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
}
