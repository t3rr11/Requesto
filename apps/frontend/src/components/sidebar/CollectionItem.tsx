import React, { useMemo, useState } from 'react';
import type { Collection, SavedRequest, SyncPreviewResult } from '../../store/collections/types';
import { useDroppable, useDndContext } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useCollectionsStore } from '../../store/collections/store';
import { useUIStore } from '../../store/ui/store';
import { useAlertStore } from '../../store/alert/store';
import { FolderItem } from './FolderItem';
import { RequestItem } from './RequestItem';
import { Button } from '../Button';
import { ContextMenu } from '../ContextMenu';
import { ConfirmDialog } from '../ConfirmDialog';
import { SyncPreviewDialog } from '../SyncPreviewDialog';
import { CollectionRunnerDialog } from '../CollectionRunnerDialog';
import { useItemContextMenu } from '../../hooks/useItemContextMenu';
import { useItemDragDrop } from '../../hooks/useItemDragDrop';
import { useItemActions } from '../../hooks/useItemActions';
import {
  ChevronRight,
  ChevronDown,
  Package,
  FolderPlus,
  FileText,
  Trash2,
  Download,
  RefreshCw,
  Link2,
  Unlink,
  Copy,
  Play,
} from 'lucide-react';

interface CollectionItemProps {
  collection: Collection;
  searchQuery?: string;
  onRenameRequest: (request: SavedRequest) => void;
  onRenameCollection: (collectionId: string, collectionName: string) => void;
  onRenameFolder: (collectionId: string, folderId: string, folderName: string) => void;
  onCreateFolder: (collectionId: string, parentId?: string) => void;
}

export function CollectionItem({
  collection,
  searchQuery,
  onRenameRequest,
  onRenameCollection,
  onRenameFolder,
  onCreateFolder,
}: CollectionItemProps) {
  const { exportCollection, exportRequest, syncPreview, syncApply, unlinkSpec } = useCollectionsStore();
  const { showAlert } = useAlertStore();
  const { expandedCollections, toggleCollection, selectedRequestIds, toggleRequestSelection, clearSelection } =
    useUIStore();

  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncPreviewData, setSyncPreviewData] = useState<SyncPreviewResult | null>(null);
  const [runnerOpen, setRunnerOpen] = useState(false);

  const {
    requestContextMenu,
    openRequestContextMenu,
    closeRequestContextMenu,
    collectionContextMenu,
    openCollectionContextMenu,
    closeCollectionContextMenu,
  } = useItemContextMenu();

  const {
    activeSavedRequestId,
    handleSelectRequest,
    handleDeleteCollection,
    handleDeleteRequest,
    confirmDialog,
  } = useItemActions();

  const {
    isDragOver,
    handleDragOver,
    handleDragLeave,
  } = useItemDragDrop({
    onDropFolder: async (collectionId, folderId) => {
      if (folderId !== collection.id) {
        const { moveFolder } = useCollectionsStore.getState();
        await moveFolder(collectionId, folderId, collection.id, undefined);
      }
    },
  });

  const { setNodeRef: setCollectionDropRef, isOver: isRequestDragOver } = useDroppable({
    id: `${collection.id}-root`,
    data: { type: 'collection-root', collectionId: collection.id, folderId: undefined },
  });

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: collection.id,
    data: { type: 'collection', collectionId: collection.id },
    disabled: !!searchQuery?.trim() || !!collection.isSystem,
  });

  const { active } = useDndContext();
  const isDraggingCollection = active?.data.current?.type === 'collection';

  const isExpanded = expandedCollections.has(collection.id);
  const isSearching = !!searchQuery?.trim();
  const query = searchQuery?.toLowerCase() ?? '';

  const { filteredRootFolders, filteredRootRequests } = useMemo(() => {
    const rootFolders = (collection.folders || []).filter(f => !f.parentId);
    const rootRequests = collection.requests.filter(r => !r.folderId).sort((a, b) => (a.order || 0) - (b.order || 0));
    if (!query) return { filteredRootFolders: rootFolders, filteredRootRequests: rootRequests };
    const matchedFolderIds = new Set<string>();
    for (const folder of collection.folders || []) {
      if (folder.name.toLowerCase().includes(query)) matchedFolderIds.add(folder.id);
      const folderReqs = collection.requests.filter(r => r.folderId === folder.id);
      if (folderReqs.some(r => r.name.toLowerCase().includes(query) || r.url.toLowerCase().includes(query))) matchedFolderIds.add(folder.id);
    }
    for (const folder of collection.folders || []) {
      if (matchedFolderIds.has(folder.id) && folder.parentId) {
        let parentId: string | undefined = folder.parentId;
        while (parentId) {
          matchedFolderIds.add(parentId);
          const parent = collection.folders?.find(f => f.id === parentId);
          parentId = parent?.parentId;
        }
      }
    }
    return {
      filteredRootFolders: rootFolders.filter(f => matchedFolderIds.has(f.id)),
      filteredRootRequests: rootRequests.filter(r => r.name.toLowerCase().includes(query) || r.url.toLowerCase().includes(query)),
    };
  }, [collection, query]);

  const showExpanded = isSearching || isExpanded;

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('application/folder')) {
      const data = JSON.parse(e.dataTransfer.getData('application/folder'));
      if (data.folderId !== collection.id) {
        const { moveFolder } = useCollectionsStore.getState();
        await moveFolder(data.collectionId, data.folderId, collection.id, undefined);
      }
    }
  };

  const handleRenameRequestFromContext = () => {
    if (!requestContextMenu) return;
    onRenameRequest(requestContextMenu.request);
    closeRequestContextMenu();
  };

  const handleDeleteRequestFromContext = () => {
    if (!requestContextMenu) return;
    const isMulti = selectedRequestIds.size > 1 && selectedRequestIds.has(requestContextMenu.request.id);
    const { deleteRequest, deleteRequests } = useCollectionsStore.getState();
    const allRequests = useCollectionsStore.getState().collections.flatMap(c => c.requests);
    const targets = isMulti
      ? [...selectedRequestIds].map(id => allRequests.find(r => r.id === id)).filter((r): r is SavedRequest => r !== undefined)
      : [requestContextMenu.request];
    confirmDialog.open({
      title: `Delete ${targets.length > 1 ? `${targets.length} Requests` : 'Request'}`,
      message:
        targets.length > 1
          ? `Are you sure you want to delete these ${targets.length} requests? This action cannot be undone.`
          : 'Are you sure you want to delete this request? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        if (targets.length > 1) {
          await deleteRequests(targets.map(r => ({ collectionId: r.collectionId, requestId: r.id })));
        } else {
          await deleteRequest(targets[0].collectionId, targets[0].id);
        }
      },
    });
    closeRequestContextMenu();
  };

  const handleNewFolderFromContext = () => {
    if (!collectionContextMenu) return;
    onCreateFolder(collectionContextMenu.collectionId);
    closeCollectionContextMenu();
  };

  const handleRenameCollectionFromContext = () => {
    if (!collectionContextMenu) return;
    onRenameCollection(collectionContextMenu.collectionId, collectionContextMenu.collectionName);
    closeCollectionContextMenu();
  };

  const handleDeleteCollectionFromContext = () => {
    if (!collectionContextMenu) return;
    const { deleteCollection } = useCollectionsStore.getState();
    confirmDialog.open({
      title: 'Delete Collection',
      message: 'Are you sure you want to delete this collection and all its requests? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        await deleteCollection(collectionContextMenu.collectionId);
      },
    });
    closeCollectionContextMenu();
  };

  const handleExportCollection = async () => {
    try {
      await exportCollection(collectionContextMenu!.collectionId);
      showAlert('Collection exported successfully', 'success');
    } catch {
      showAlert('Failed to export collection', 'error');
    }
    closeCollectionContextMenu();
  };

  const handleExportRequest = async () => {
    try {
      await exportRequest(requestContextMenu!.request.collectionId, requestContextMenu!.request.id);
      showAlert('Request exported successfully', 'success');
    } catch {
      showAlert('Failed to export request', 'error');
    }
    closeRequestContextMenu();
  };

  const handleDuplicateRequest = async () => {
    if (!requestContextMenu) return;
    const { duplicateRequest, duplicateRequests } = useCollectionsStore.getState();
    const isMulti = selectedRequestIds.size > 1 && selectedRequestIds.has(requestContextMenu.request.id);
    closeRequestContextMenu();
    try {
      if (isMulti) {
        const allRequests = useCollectionsStore.getState().collections.flatMap(c => c.requests);
        const targets = [...selectedRequestIds]
          .map(id => allRequests.find(r => r.id === id))
          .filter((r): r is SavedRequest => r !== undefined);
        await duplicateRequests(targets.map(r => ({ collectionId: r.collectionId, requestId: r.id })));
        showAlert(`${targets.length} requests duplicated successfully`, 'success');
      } else {
        await duplicateRequest(requestContextMenu.request.collectionId, requestContextMenu.request.id);
        showAlert('Request duplicated successfully', 'success');
      }
    } catch {
      showAlert('Failed to duplicate request', 'error');
    }
  };

  const handleSyncFromSpec = async () => {
    closeCollectionContextMenu();
    setSyncDialogOpen(true);
    setSyncLoading(true);
    setSyncPreviewData(null);
    try {
      const result = await syncPreview(collection.id);
      if ('noChanges' in result && result.noChanges) {
        showAlert('Spec is up to date — no changes detected', 'success');
        setSyncDialogOpen(false);
        return;
      }
      setSyncPreviewData(result as SyncPreviewResult);
    } catch (err) {
      showAlert(err instanceof Error ? err.message : 'Failed to check for spec changes', 'error');
      setSyncDialogOpen(false);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSyncApply = async (body: Parameters<typeof syncApply>[1]) => {
    try {
      await syncApply(collection.id, body);
      showAlert('Sync applied successfully', 'success');
    } catch (err) {
      showAlert(err instanceof Error ? err.message : 'Failed to apply sync', 'error');
    }
  };

  const handleUnlinkSpec = async () => {
    closeCollectionContextMenu();
    try {
      await unlinkSpec(collection.id);
      showAlert('Spec unlinked', 'success');
    } catch {
      showAlert('Failed to unlink spec', 'error');
    }
  };

  const handleRunCollection = () => {
    closeCollectionContextMenu();
    setRunnerOpen(true);
  };

  const handleDuplicateCollection = async () => {
    if (!collectionContextMenu) return;
    const { duplicateCollection } = useCollectionsStore.getState();
    closeCollectionContextMenu();
    try {
      await duplicateCollection(collectionContextMenu.collectionId);
      showAlert('Collection duplicated successfully', 'success');
    } catch {
      showAlert('Failed to duplicate collection', 'error');
    }
  };

  const isLinked = !!collection.openApiSpec;

  const rootFolders = filteredRootFolders;
  const rootRequests = filteredRootRequests;
  const totalItems = collection.requests.length;
  const allRequestIds = rootRequests.map(r => r.id);

  return (
    <div
      ref={setSortableRef}
      className="mb-0.5"
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      <div
        ref={setCollectionDropRef}
        className={`px-3 py-2 cursor-pointer flex items-center justify-between group transition-colors ${
          !isDraggingCollection && (isDragOver || isRequestDragOver)
            ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
        }`}
        onClick={() => toggleCollection(collection.id)}
        onContextMenu={e => openCollectionContextMenu(e, collection.id, collection.name)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
          )}
          <Package className="w-4 h-4 text-orange-500 dark:text-orange-400 shrink-0" />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{collection.name}</span>
          {isLinked && (
            <span title={`Linked to ${collection.openApiSpec!.source}`}>
              <Link2 className="w-3 h-3 text-blue-500 shrink-0" />
            </span>
          )}
          <span className="ml-1 text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded px-1.5 py-0.5 font-medium shrink-0">
            {totalItems}
          </span>
        </div>
        {!collection.isSystem && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
            <Button
              onClick={e => { e.stopPropagation(); onCreateFolder(collection.id); }}
              variant="icon"
              size="sm"
              title="New Folder"
              className="hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </Button>
            <Button
              onClick={e => handleDeleteCollection(collection.id, e)}
              variant="icon"
              size="sm"
              title="Delete Collection"
              className="hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {showExpanded && (
        <div className="ml-4 border-l border-gray-200 dark:border-gray-700">
          {rootFolders.map(folder => (
            <FolderItem
              key={folder.id}
              folder={folder}
              collection={collection}
              searchQuery={searchQuery}
              onRenameRequest={onRenameRequest}
              onRenameFolder={onRenameFolder}
              onCreateFolder={onCreateFolder}
            />
          ))}

          {rootRequests.length === 0 && rootFolders.length === 0 ? (
            <div className="pl-3 pr-4 py-2 text-xs text-gray-400 italic">No requests yet</div>
          ) : (
            <SortableContext items={rootRequests.map(r => r.id)} strategy={verticalListSortingStrategy}>
              {rootRequests.map(request => (
                <RequestItem
                  key={request.id}
                  request={request}
                  collectionId={collection.id}
                  isActive={activeSavedRequestId === request.id}
                  isSelected={selectedRequestIds.has(request.id)}
                  onSelect={e => {
                    if (e.ctrlKey || e.metaKey) {
                      toggleRequestSelection(request.id, true, false);
                    } else if (e.shiftKey) {
                      toggleRequestSelection(request.id, false, true, allRequestIds);
                    } else {
                      handleSelectRequest(request);
                      clearSelection();
                    }
                  }}
                  onContextMenu={e => openRequestContextMenu(e, request)}
                  onDelete={e => handleDeleteRequest(collection.id, request.id, e)}
                />
              ))}
            </SortableContext>
          )}
        </div>
      )}

      {requestContextMenu && (
        <ContextMenu
          position={{ x: requestContextMenu.x, y: requestContextMenu.y }}
          items={[
            { label: 'Rename', icon: <FileText className="w-4 h-4" />, onClick: handleRenameRequestFromContext },
            {
              label: selectedRequestIds.size > 1 && selectedRequestIds.has(requestContextMenu.request.id)
                ? `Duplicate (${selectedRequestIds.size})`
                : 'Duplicate',
              icon: <Copy className="w-4 h-4" />,
              onClick: handleDuplicateRequest,
            },
            { label: 'Export', icon: <Download className="w-4 h-4" />, onClick: handleExportRequest },
            {
              label: selectedRequestIds.size > 1 && selectedRequestIds.has(requestContextMenu.request.id)
                ? `Delete (${selectedRequestIds.size})`
                : 'Delete',
              icon: <Trash2 className="w-4 h-4" />,
              onClick: handleDeleteRequestFromContext,
              danger: true,
            },
          ]}
          onClose={closeRequestContextMenu}
        />
      )}

      {collectionContextMenu && (
        <ContextMenu
          position={{ x: collectionContextMenu.x, y: collectionContextMenu.y }}
          items={[
            { label: 'Run Collection', icon: <Play className="w-4 h-4" />, onClick: handleRunCollection },
            ...(collection.isSystem ? [] : [
              { label: 'New Folder', icon: <FolderPlus className="w-4 h-4" />, onClick: handleNewFolderFromContext },
              { label: 'Rename', icon: <FileText className="w-4 h-4" />, onClick: handleRenameCollectionFromContext },
              { label: 'Duplicate', icon: <Copy className="w-4 h-4" />, onClick: handleDuplicateCollection },
            ]),
            { label: 'Export', icon: <Download className="w-4 h-4" />, onClick: handleExportCollection },
            ...(isLinked ? [
              { label: 'Sync from Spec', icon: <RefreshCw className="w-4 h-4" />, onClick: handleSyncFromSpec },
              { label: 'Unlink Spec', icon: <Unlink className="w-4 h-4" />, onClick: handleUnlinkSpec },
            ] : []),
            ...(collection.isSystem ? [] : [
              { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: handleDeleteCollectionFromContext, danger: true },
            ]),
          ]}
          onClose={closeCollectionContextMenu}
        />
      )}

      <SyncPreviewDialog
        isOpen={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
        preview={syncPreviewData}
        loading={syncLoading}
        onApply={handleSyncApply}
      />

      <ConfirmDialog {...confirmDialog.props} />

      <CollectionRunnerDialog
        isOpen={runnerOpen}
        onClose={() => setRunnerOpen(false)}
        collection={collection}
      />
    </div>
  );
}
