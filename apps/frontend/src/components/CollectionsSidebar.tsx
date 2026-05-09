import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Folder as FolderIcon, FolderPlus, Import, Search, X, FileText, Braces } from 'lucide-react';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useUIStore } from '../store/ui/store';
import { useGitStore } from '../store/git/store';
import { useCollectionsStore } from '../store/collections/store';
import { useAlertStore } from '../store/alert/store';
import type { SavedRequest } from '../store/collections/types';
import { Dialog } from './Dialog';
import { ConfirmDialog } from './ConfirmDialog';
import { RenameForm } from '../forms/RenameForm';
import { NewCollectionForm } from '../forms/NewCollectionForm';
import { NewFolderForm } from '../forms/NewFolderForm';
import { ImportOpenApiForm } from '../forms/ImportOpenApiForm';
import { CollectionItem } from './sidebar/CollectionItem';
import { MethodBadge } from './sidebar/MethodBadge';
import { Button } from './Button';
import { ContextMenu } from './ContextMenu';
import { GitStatusBar } from './GitStatusBar';
import { GitAccordion } from './GitAccordion';
import { useDialog, useDialogWithData, useConfirmDialog } from '../hooks/useDialog';
import { useResizablePanel } from '../hooks/useResizablePanel';import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import type { CollisionDetection } from '@dnd-kit/core';

interface RenameRequestData {
  request: SavedRequest;
}

interface RenameCollectionData {
  id: string;
  name: string;
}

interface RenameFolderData {
  collectionId: string;
  id: string;
  name: string;
}

interface NewFolderData {
  collectionId: string;
  parentId?: string;
}

export function CollectionsSidebar() {
  const {
    isSidebarOpen,
    sidebarWidth,
    setSidebarWidth,
    isGitPanelOpen,
    gitPanelHeight,
    toggleGitPanel,
    setGitPanelHeight,
    setGitPanelOpen,
    clearSelection,
  } = useUIStore();
  const { isRepo } = useGitStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { collections, loading, importCollection, updateCollection, updateRequest, updateFolder, moveRequest, moveCollection, deleteRequests, duplicateRequests } =
    useCollectionsStore();
  const { showAlert } = useAlertStore();
  const clipboardRef = useRef<SavedRequest[]>([]);
  const multiDeleteDialog = useConfirmDialog();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      // Don't fire when a modal dialog is open
      if (document.querySelector('[role="dialog"]')) return;

      const ids = useUIStore.getState().selectedRequestIds as Set<string>;
      if (ids.size === 0) return;

      const isMod = e.ctrlKey || e.metaKey;

      if (isMod && e.key === 'c') {
        e.preventDefault();
        const allRequests = useCollectionsStore.getState().collections.flatMap(c => c.requests);
        clipboardRef.current = [...ids]
          .map(id => allRequests.find(r => r.id === id))
          .filter((r): r is SavedRequest => r !== undefined);
        showAlert(
          `${clipboardRef.current.length} request${clipboardRef.current.length !== 1 ? 's' : ''} copied`,
          'success',
        );
        return;
      }

      if (isMod && e.key === 'v') {
        if (clipboardRef.current.length === 0) return;
        e.preventDefault();
        const reqs = clipboardRef.current.map(r => ({ collectionId: r.collectionId, requestId: r.id }));
        duplicateRequests(reqs)
          .then(() =>
            showAlert(
              `${reqs.length} request${reqs.length !== 1 ? 's' : ''} pasted`,
              'success',
            ),
          )
          .catch(() => showAlert('Failed to paste requests', 'error'));
        return;
      }

      if (e.key === 'Delete') {
        e.preventDefault();
        const allRequests = useCollectionsStore.getState().collections.flatMap(c => c.requests);
        const toDelete = [...ids]
          .map(id => allRequests.find(r => r.id === id))
          .filter((r): r is SavedRequest => r !== undefined);
        if (toDelete.length === 0) return;
        multiDeleteDialog.open({
          title: `Delete ${toDelete.length} Request${toDelete.length !== 1 ? 's' : ''}`,
          message:
            toDelete.length === 1
              ? 'Are you sure you want to delete this request? This action cannot be undone.'
              : `Are you sure you want to delete these ${toDelete.length} requests? This action cannot be undone.`,
          confirmText: 'Delete',
          variant: 'danger',
          onConfirm: async () => {
            await deleteRequests(
              toDelete.map(r => ({ collectionId: r.collectionId, requestId: r.id })),
            );
            clearSelection();
          },
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [clearSelection, deleteRequests, duplicateRequests, multiDeleteDialog, showAlert]);

  // Close the git panel when switching to a workspace that isn't a git repo
  useEffect(() => {
    if (!isRepo && isGitPanelOpen) {
      setGitPanelOpen(false);
    }
  }, [isRepo, isGitPanelOpen, setGitPanelOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const collisionDetection: CollisionDetection = useCallback((args) => {
    if (args.active.data.current?.type === 'collection') {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter(
          c => c.data.current?.type === 'collection'
        ),
      });
    }
    return closestCenter(args);
  }, []);

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (!over || active.id === over.id) return;

    const activeData = active.data.current as { type: string; collectionId?: string; folderId?: string } | undefined;
    if (!activeData) return;

    if (activeData.type === 'collection') {
      const overData = over.data.current as { type: string; collectionId?: string } | undefined;
      if (!overData) return;
      
      const targetCollectionId =
        overData.type === 'collection'
          ? (over.id as string)
          : overData.type === 'collection-root' && overData.collectionId
            ? overData.collectionId
            : null;
      if (!targetCollectionId) return;
      const targetIndex = collections.findIndex(c => c.id === targetCollectionId);
      if (targetIndex === -1) return;
      moveCollection(active.id as string, targetIndex);
      return;
    }

    if (activeData.type !== 'request') return;

    const overData = over.data.current as { type: string; collectionId: string; folderId?: string } | undefined;
    if (!overData) return;

    let targetCollectionId: string;
    let targetFolderId: string | undefined;
    let targetOrder: number | undefined;

    if (overData.type === 'request') {
      targetCollectionId = overData.collectionId;
      targetFolderId = overData.folderId;
      const targetCollection = collections.find(c => c.id === targetCollectionId);
      if (!targetCollection) return;
      const slotRequests = targetCollection.requests
        .filter(r => r.folderId === targetFolderId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      targetOrder = slotRequests.findIndex(r => r.id === over.id);
      if (targetOrder === -1) return;
    } else if (overData.type === 'folder' || overData.type === 'collection-root') {
      targetCollectionId = overData.collectionId;
      targetFolderId = overData.folderId;
      // targetOrder undefined → appends to end of target container
    } else {
      return;
    }

    moveRequest(activeData.collectionId!, active.id as string, targetCollectionId, targetFolderId, targetOrder);
    clearSelection();
  };

  const activeCollection = activeId ? collections.find(c => c.id === activeId) : null;
  const activeRequest = activeId && !activeCollection ? collections.flatMap(c => c.requests).find(r => r.id === activeId) : null;

  const { handleResizeStart } = useResizablePanel({
    containerRef: sidebarRef,
    axis: 'horizontal',
    onResize: setSidebarWidth,
    min: 200,
    max: 600,
  });

  const filteredCollections = useMemo(() => {
    if (!searchQuery.trim()) return collections;
    const query = searchQuery.toLowerCase();
    return collections.filter(collection => {
      if (collection.name.toLowerCase().includes(query)) return true;
      if (collection.requests.some(r => r.name.toLowerCase().includes(query) || r.url.toLowerCase().includes(query)))
        return true;
      if (collection.folders?.some(f => f.name.toLowerCase().includes(query))) return true;
      return false;
    });
  }, [collections, searchQuery]);

  const newCollectionDialog = useDialog();
  const importOpenApiDialog = useDialog();
  const renameRequestDialog = useDialogWithData<RenameRequestData>();
  const renameCollectionDialog = useDialogWithData<RenameCollectionData>();
  const renameFolderDialog = useDialogWithData<RenameFolderData>();
  const newFolderDialog = useDialogWithData<NewFolderData>();
  const [importMenuPos, setImportMenuPos] = useState<{ x: number; y: number } | null>(null);
  const importButtonRef = useRef<HTMLButtonElement>(null);

  const { handleResizeStart: handleGitPanelResizeStart } = useResizablePanel({
    containerRef: sidebarRef,
    axis: 'vertical',
    onResize: setGitPanelHeight,
    min: 120,
    max: containerHeight => containerHeight * 0.7,
    origin: 'end',
  });

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        sidebarRef.current?.contains(target) &&
        !target.closest('[data-request-item]') &&
        !target.closest('[data-folder-item]') &&
        !target.closest('button')
      ) {
        clearSelection();
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [clearSelection]);

  const handleSaveRequestRename = async (newName: string) => {
    if (!renameRequestDialog.data) return;
    await updateRequest(renameRequestDialog.data.request.collectionId, renameRequestDialog.data.request.id, {
      name: newName,
    });
    renameRequestDialog.close();
  };

  const handleSaveCollectionRename = async (newName: string) => {
    if (!renameCollectionDialog.data) return;
    await updateCollection(renameCollectionDialog.data.id, { name: newName });
    renameCollectionDialog.close();
  };

  const handleSaveFolderRename = async (newName: string) => {
    if (!renameFolderDialog.data) return;
    await updateFolder(renameFolderDialog.data.collectionId, renameFolderDialog.data.id, { name: newName });
    renameFolderDialog.close();
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportMenuOpen = () => {
    if (importButtonRef.current) {
      const rect = importButtonRef.current.getBoundingClientRect();
      setImportMenuPos({ x: rect.left, y: rect.bottom + 4 });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importCollection(file);
      showAlert('Collection imported successfully', 'success');
    } catch {
      showAlert('Failed to import collection. Please check the file format.', 'error');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isSidebarOpen) return null;

  return (
    <div
      ref={sidebarRef}
      className="bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col relative flex-none min-h-0"
      style={{ width: `${sidebarWidth}px` }}
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Collections</h2>
          <div className="flex gap-2">
            <Button onClick={newCollectionDialog.open} variant="icon" size="md" title="New Collection">
              <FolderPlus className="w-5 h-5" />
            </Button>
            <Button ref={importButtonRef} onClick={handleImportMenuOpen} variant="icon" size="md" title="Import">
              <Import className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search collections..."
            className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <X className="w-3 h-3 text-gray-400 dark:text-gray-500" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">Loading collections...</div>
        ) : collections.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <FolderIcon className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-sm">No collections yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create one to organize your requests</p>
          </div>
        ) : filteredCollections.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <Search className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-sm">No matching results</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try a different search term</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => {
              document.body.style.cursor = '';
              document.body.style.userSelect = '';
            }}
          >
            <div className="py-2">
              <SortableContext items={filteredCollections.map(c => c.id)} strategy={verticalListSortingStrategy}>
                {filteredCollections.map(collection => (
                  <CollectionItem
                    key={collection.id}
                    collection={collection}
                    searchQuery={searchQuery}
                    onRenameRequest={request => renameRequestDialog.open({ request })}
                    onRenameCollection={(id, name) => renameCollectionDialog.open({ id, name })}
                    onRenameFolder={(collectionId, id, name) => renameFolderDialog.open({ collectionId, id, name })}
                    onCreateFolder={(collectionId, parentId) => newFolderDialog.open({ collectionId, parentId })}
                  />
                ))}
              </SortableContext>
            </div>
            <DragOverlay dropAnimation={null}>
              {activeCollection && (
                <div className="bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700 rounded py-2 px-3 flex items-center gap-2 opacity-90">
                  <FolderIcon className="w-4 h-4 text-orange-500 dark:text-orange-400 shrink-0" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{activeCollection.name}</span>
                </div>
              )}
              {activeRequest && (
                <div className="bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700 rounded py-2 px-3 flex items-center gap-2 opacity-90">
                  <MethodBadge method={activeRequest.method} />
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{activeRequest.name}</span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <Dialog isOpen={newCollectionDialog.isOpen} onClose={newCollectionDialog.close} title="New Collection">
        <NewCollectionForm onSuccess={newCollectionDialog.close} onCancel={newCollectionDialog.close} />
      </Dialog>

      <Dialog isOpen={newFolderDialog.isOpen} onClose={newFolderDialog.close} title="New Folder">
        {newFolderDialog.data && (
          <NewFolderForm
            collectionId={newFolderDialog.data.collectionId}
            parentId={newFolderDialog.data.parentId}
            onSuccess={newFolderDialog.close}
            onCancel={newFolderDialog.close}
          />
        )}
      </Dialog>

      <Dialog isOpen={importOpenApiDialog.isOpen} onClose={importOpenApiDialog.close} title="Import from OpenAPI">
        <ImportOpenApiForm onSuccess={importOpenApiDialog.close} onCancel={importOpenApiDialog.close} />
      </Dialog>

      <RenameForm
        isOpen={renameRequestDialog.isOpen}
        onClose={renameRequestDialog.close}
        onSave={handleSaveRequestRename}
        currentName={renameRequestDialog.data?.request.name ?? ''}
        title="Rename Request"
        label="Request Name"
      />

      <RenameForm
        isOpen={renameCollectionDialog.isOpen}
        onClose={renameCollectionDialog.close}
        onSave={handleSaveCollectionRename}
        currentName={renameCollectionDialog.data?.name ?? ''}
        title="Rename Collection"
        label="Collection Name"
        placeholder="Enter collection name..."
      />

      <RenameForm
        isOpen={renameFolderDialog.isOpen}
        onClose={renameFolderDialog.close}
        onSave={handleSaveFolderRename}
        currentName={renameFolderDialog.data?.name ?? ''}
        title="Rename Folder"
        label="Folder Name"
        placeholder="Enter folder name..."
      />

      {importMenuPos && (
        <ContextMenu
          position={importMenuPos}
          onClose={() => setImportMenuPos(null)}
          items={[
            {
              label: 'Import Collection',
              icon: <FileText className="w-4 h-4" />,
              onClick: handleImportClick,
            },
            {
              label: 'OpenAPI Spec',
              icon: <Braces className="w-4 h-4" />,
              onClick: () => importOpenApiDialog.open(),
            },
          ]}
        />
      )}

      {isGitPanelOpen && (
        <div className="flex flex-col flex-none min-h-0 overflow-hidden" style={{ height: `${gitPanelHeight}px` }}>
          <div
            className="h-1 bg-gray-200 dark:bg-gray-700 hover:bg-orange-500 cursor-ns-resize transition-colors shrink-0"
            onMouseDown={handleGitPanelResizeStart}
            title="Drag to resize"
          />
          <GitStatusBar onTogglePanel={toggleGitPanel} />
          <GitAccordion isOpen />
        </div>
      )}
      {!isGitPanelOpen && <GitStatusBar onTogglePanel={toggleGitPanel} />}

      <ConfirmDialog {...multiDeleteDialog.props} />

      <div
        className="absolute top-0 right-0 w-1 h-full bg-gray-200 dark:bg-gray-700 hover:bg-orange-500 cursor-ew-resize transition-colors"
        onMouseDown={handleResizeStart}
        title="Drag to resize"
      />
    </div>
  );
}
