import React, { useMemo, useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder as FolderIcon,
  FolderPlus,
  FileText,
  Trash2,
  Plus,
  Download,
  RefreshCw,
  Link2,
  Unlink,
  Copy,
} from 'lucide-react';
import type { Collection, SavedRequest, SyncPreviewResult } from '../store/collections/types';
import { useCollectionsStore } from '../store/collections/store';
import { useUIStore } from '../store/ui/store';
import { useAlertStore } from '../store/alert/store';

import { FolderItem } from './FolderItem';
import { getMethodColor } from '../helpers/collections';
import { Button } from './Button';
import { ContextMenu } from './ContextMenu';
import { ConfirmDialog } from './ConfirmDialog';
import { SyncPreviewDialog } from './SyncPreviewDialog';
import { useItemContextMenu } from '../hooks/useItemContextMenu';
import { useItemDragDrop } from '../hooks/useItemDragDrop';
import { useItemActions } from '../hooks/useItemActions';

interface CollectionItemProps {
  collection: Collection;
  searchQuery?: string;
  onOpenNewRequest: (collectionId?: string, folderId?: string) => void;
  onRenameRequest: (request: SavedRequest) => void;
  onRenameCollection: (collectionId: string, collectionName: string) => void;
  onRenameFolder: (collectionId: string, folderId: string, folderName: string) => void;
}

export function CollectionItem({
  collection,
  searchQuery,
  onOpenNewRequest,
  onRenameRequest,
  onRenameCollection,
  onRenameFolder,
}: CollectionItemProps) {
  const { moveRequest, exportCollection, exportRequest, syncPreview, syncApply, unlinkSpec } = useCollectionsStore();
  const { showAlert } = useAlertStore();
  const { expandedCollections, toggleCollection, selectedRequestIds, toggleRequestSelection, clearSelection } =
    useUIStore();

  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncPreviewData, setSyncPreviewData] = useState<SyncPreviewResult | null>(null);

  const {
    requestContextMenu,
    openRequestContextMenu,
    closeRequestContextMenu,
    collectionContextMenu,
    openCollectionContextMenu,
    closeCollectionContextMenu,
  } = useItemContextMenu();

  const {
    newFolderInput,
    folderName,
    setFolderName,
    startCreateFolder,
    handleSaveFolder,
    handleCancelFolder,
    activeSavedRequestId,
    handleSelectRequest,
    handleDeleteCollection,
    handleDeleteRequest,
    confirmDialog,
  } = useItemActions();

  const {
    isDragOver,
    dragOverIndex,
    handleDragOver,
    handleDragLeave,
    handleDragOverIndex,
    handleDragLeaveIndex,
    handleDropAtIndex,
    createRequestDragHandlers,
  } = useItemDragDrop({
    onDropRequest: async (collectionId, requestId, targetOrder) => {
      await moveRequest(collectionId, requestId, collection.id, undefined, targetOrder);
      clearSelection();
    },
    onDropFolder: async (collectionId, folderId) => {
      if (folderId !== collection.id) {
        const { moveFolder } = useCollectionsStore.getState();
        await moveFolder(collectionId, folderId, collection.id, undefined);
      }
    },
    onDropMultipleRequests: async (requests, targetOrder) => {
      for (const req of requests) {
        await moveRequest(req.collectionId, req.requestId, collection.id, undefined, targetOrder);
      }
      clearSelection();
    },
  });

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
    // Also include parent folders of matched folders
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
    const dragType = e.dataTransfer.types.find(t => t.startsWith('application/'));
    if (dragType === 'application/request') {
      const data = JSON.parse(e.dataTransfer.getData('application/request'));
      if (data.isMultiSelect) {
        for (const req of data.requests) await moveRequest(req.collectionId, req.requestId, collection.id, undefined);
        clearSelection();
      } else {
        await moveRequest(data.collectionId, data.requestId, collection.id, undefined);
      }
    } else if (dragType === 'application/folder') {
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
    const { deleteRequest } = useCollectionsStore.getState();
    confirmDialog.open({
      title: 'Delete Request',
      message: 'Are you sure you want to delete this request? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        await deleteRequest(requestContextMenu.request.collectionId, requestContextMenu.request.id);
      },
    });
    closeRequestContextMenu();
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
    const { duplicateRequest } = useCollectionsStore.getState();
    try {
      await duplicateRequest(requestContextMenu.request.collectionId, requestContextMenu.request.id);
      showAlert('Request duplicated successfully', 'success');
    } catch {
      showAlert('Failed to duplicate request', 'error');
    }
    closeRequestContextMenu();
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

  const isLinked = !!collection.openApiSpec;

  const rootFolders = filteredRootFolders;
  const rootRequests = filteredRootRequests;
  const totalItems = collection.requests.length;
  const allRequestIds = rootRequests.map(r => r.id);

  return (
    <div className="mb-1">
      <div
        className={`px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer flex items-center justify-between group ${
          isDragOver ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : ''
        }`}
        onClick={() => toggleCollection(collection.id)}
        onContextMenu={e => openCollectionContextMenu(e, collection.id, collection.name)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
          )}
          <FolderIcon className="w-4 h-4 text-orange-500 dark:text-orange-400 shrink-0" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{collection.name}</span>
          {isLinked && <span title={`Linked to ${collection.openApiSpec!.source}`}><Link2 className="w-3 h-3 text-blue-500 shrink-0" /></span>}
          <span className="text-xs text-gray-400 dark:text-gray-500">({totalItems})</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          <Button onClick={e => { e.stopPropagation(); onOpenNewRequest(collection.id); }} variant="icon" size="sm" title="Add Request" className="hover:bg-gray-200">
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <Button onClick={e => { e.stopPropagation(); startCreateFolder(collection.id); }} variant="icon" size="sm" title="New Folder" className="hover:bg-gray-200">
            <FolderPlus className="w-3.5 h-3.5" />
          </Button>
          <Button onClick={e => handleDeleteCollection(collection.id, e)} variant="icon" size="sm" title="Delete Collection" className="hover:bg-gray-200">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {showExpanded && (
        <div>
          {newFolderInput?.collectionId === collection.id && !newFolderInput?.parentId && (
            <div className="px-4 py-2 flex items-center gap-2 ml-6">
              <FolderIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
              <input
                type="text"
                value={folderName}
                onChange={e => setFolderName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveFolder(collection.id);
                  if (e.key === 'Escape') handleCancelFolder();
                }}
                placeholder="Folder name..."
                className="flex-1 px-2 py-1 text-sm border border-blue-300 dark:border-blue-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                autoFocus
              />
              <Button onClick={() => handleSaveFolder(collection.id)} variant="primary" size="sm">Save</Button>
              <Button onClick={handleCancelFolder} variant="secondary" size="sm">Cancel</Button>
            </div>
          )}

          {rootFolders.map(folder => (
            <FolderItem
              key={folder.id}
              folder={folder}
              collection={collection}
              depth={0}
              searchQuery={searchQuery}
              onOpenNewRequest={onOpenNewRequest}
              onRenameRequest={onRenameRequest}
              onRenameFolder={onRenameFolder}
            />
          ))}

          {rootRequests.length === 0 && rootFolders.length === 0 ? (
            <div className="px-4 py-2 text-xs text-gray-400 italic ml-6">No requests yet</div>
          ) : (
            rootRequests.map((request, index) => (
              <div key={request.id}>
                <div
                  className={`transition-all ${dragOverIndex === index ? 'bg-blue-400 h-1' : 'h-0'}`}
                  onDragOver={e => handleDragOverIndex(e, index)}
                  onDragLeave={handleDragLeaveIndex}
                  onDrop={e => handleDropAtIndex(e, index)}
                />
                <div
                  data-request-item
                  className={`px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer flex items-center justify-between group ${
                    activeSavedRequestId === request.id ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : ''
                  } ${selectedRequestIds.has(request.id) ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : ''}`}
                  style={{ paddingLeft: '32px' }}
                  onClick={e => {
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
                  {...createRequestDragHandlers(request.id, collection.id)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
                    <span className={`text-xs font-medium ${getMethodColor(request.method)} min-w-11.25`}>
                      {request.method}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{request.name}</span>
                  </div>
                  <button
                    onClick={e => handleDeleteRequest(collection.id, request.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all"
                    title="Delete Request"
                  >
                    <Trash2 className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
                {index === rootRequests.length - 1 && (
                  <div
                    className={`transition-all ${dragOverIndex === index + 1 ? 'bg-blue-400 h-1' : 'h-0'}`}
                    onDragOver={e => handleDragOverIndex(e, index + 1)}
                    onDragLeave={handleDragLeaveIndex}
                    onDrop={e => handleDropAtIndex(e, index + 1)}
                  />
                )}
              </div>
            ))
          )}
        </div>
      )}

      {requestContextMenu && (
        <ContextMenu
          position={{ x: requestContextMenu.x, y: requestContextMenu.y }}
          items={[
            { label: 'Rename', icon: <FileText className="w-4 h-4" />, onClick: handleRenameRequestFromContext },
            { label: 'Duplicate', icon: <Copy className="w-4 h-4" />, onClick: handleDuplicateRequest },
            { label: 'Export', icon: <Download className="w-4 h-4" />, onClick: handleExportRequest },
            { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: handleDeleteRequestFromContext, danger: true },
          ]}
          onClose={closeRequestContextMenu}
        />
      )}

      {collectionContextMenu && (
        <ContextMenu
          position={{ x: collectionContextMenu.x, y: collectionContextMenu.y }}
          items={[
            { label: 'Rename', icon: <FileText className="w-4 h-4" />, onClick: handleRenameCollectionFromContext },
            { label: 'Export', icon: <Download className="w-4 h-4" />, onClick: handleExportCollection },
            ...(isLinked ? [
              { label: 'Sync from Spec', icon: <RefreshCw className="w-4 h-4" />, onClick: handleSyncFromSpec },
              { label: 'Unlink Spec', icon: <Unlink className="w-4 h-4" />, onClick: handleUnlinkSpec },
            ] : []),
            { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: handleDeleteCollectionFromContext, danger: true },
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
    </div>
  );
}
