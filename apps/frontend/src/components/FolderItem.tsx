import { useMemo, useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder as FolderIcon,
  FolderPlus,
  FileText,
  Trash2,
  Download,
  Copy,
  Play,
} from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Folder, Collection, SavedRequest } from '../store/collections/types';
import { useCollectionsStore } from '../store/collections/store';
import { useUIStore } from '../store/ui/store';
import { useAlertStore } from '../store/alert/store';
import { RequestItem } from './RequestItem';
import { Button } from './Button';
import { ContextMenu } from './ContextMenu';
import { ConfirmDialog } from './ConfirmDialog';
import { CollectionRunnerDialog } from './CollectionRunnerDialog';
import { useItemContextMenu } from '../hooks/useItemContextMenu';
import { useItemDragDrop } from '../hooks/useItemDragDrop';
import { useItemActions } from '../hooks/useItemActions';

interface FolderItemProps {
  folder: Folder;
  collection: Collection;
  searchQuery?: string;
  onRenameRequest: (request: SavedRequest) => void;
  onRenameFolder: (collectionId: string, folderId: string, folderName: string) => void;
  onCreateFolder: (collectionId: string, parentId?: string) => void;
}

export function FolderItem({
  folder,
  collection,
  searchQuery,
  onRenameRequest,
  onRenameFolder,
  onCreateFolder,
}: FolderItemProps) {
  const { moveFolder, exportRequest, exportFolder } = useCollectionsStore();
  const { showAlert } = useAlertStore();
  const { expandedFolders, toggleFolder, selectedRequestIds, toggleRequestSelection, clearSelection } = useUIStore();

  const {
    requestContextMenu,
    openRequestContextMenu,
    closeRequestContextMenu,
    folderContextMenu,
    openFolderContextMenu,
    closeFolderContextMenu,
  } = useItemContextMenu();

  const {
    activeSavedRequestId,
    handleSelectRequest,
    handleDeleteFolder,
    handleDeleteRequest,
    confirmDialog,
  } = useItemActions();

  const {
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    createFolderDragHandlers,
  } = useItemDragDrop({
    onDropFolder: async (collectionId, folderId) => {
      if (folderId !== folder.id) {
        await moveFolder(collectionId, folderId, collection.id, folder.id);
      }
    },
  });

  const { setNodeRef: setFolderDropRef, isOver: isRequestDragOver } = useDroppable({
    id: folder.id,
    data: { type: 'folder', collectionId: collection.id, folderId: folder.id },
  });

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

  const handleNewSubfolderFromContext = () => {
    if (!folderContextMenu) return;
    onCreateFolder(folderContextMenu.collectionId, folderContextMenu.folderId);
    closeFolderContextMenu();
  };

  const handleRenameFolderFromContext = () => {
    if (!folderContextMenu) return;
    onRenameFolder(folderContextMenu.collectionId, folderContextMenu.folderId, folderContextMenu.folderName);
    closeFolderContextMenu();
  };

  const handleDeleteFolderFromContext = () => {
    if (!folderContextMenu) return;
    const { deleteFolder } = useCollectionsStore.getState();
    confirmDialog.open({
      title: 'Delete Folder',
      message: 'Are you sure you want to delete this folder and all its contents? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        await deleteFolder(folderContextMenu.collectionId, folderContextMenu.folderId);
      },
    });
    closeFolderContextMenu();
  };

  const handleExportFolder = async () => {
    if (!folderContextMenu) return;
    try {
      await exportFolder(folderContextMenu.collectionId, folderContextMenu.folderId);
      showAlert('Folder exported successfully', 'success');
    } catch {
      showAlert('Failed to export folder', 'error');
    }
    closeFolderContextMenu();
  };

  const handleRunFolder = () => {
    closeFolderContextMenu();
    setRunnerOpen(true);
  };

  const handleExportRequest = async () => {
    if (!requestContextMenu) return;
    try {
      await exportRequest(requestContextMenu.request.collectionId, requestContextMenu.request.id);
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

  const isSearching = !!searchQuery?.trim();
  const query = searchQuery?.toLowerCase() ?? '';
  const [runnerOpen, setRunnerOpen] = useState(false);

  const { filteredChildFolders, filteredFolderRequests } = useMemo(() => {
    const childFolders = (collection.folders || []).filter(f => f.parentId === folder.id);
    const folderRequests = collection.requests
      .filter(r => r.folderId === folder.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    if (!query) return { filteredChildFolders: childFolders, filteredFolderRequests: folderRequests };
    // Find which child folders have matching content
    const matchedFolderIds = new Set<string>();
    const allFolders = collection.folders || [];
    for (const cf of childFolders) {
      if (cf.name.toLowerCase().includes(query)) matchedFolderIds.add(cf.id);
      // Check descendants recursively
      const stack = [cf.id];
      while (stack.length) {
        const fId = stack.pop()!;
        const subReqs = collection.requests.filter(r => r.folderId === fId);
        if (subReqs.some(r => r.name.toLowerCase().includes(query) || r.url.toLowerCase().includes(query))) matchedFolderIds.add(cf.id);
        const subFolders = allFolders.filter(f => f.parentId === fId);
        for (const sf of subFolders) {
          if (sf.name.toLowerCase().includes(query)) matchedFolderIds.add(cf.id);
          stack.push(sf.id);
        }
      }
    }
    return {
      filteredChildFolders: childFolders.filter(f => matchedFolderIds.has(f.id)),
      filteredFolderRequests: folderRequests.filter(r => r.name.toLowerCase().includes(query) || r.url.toLowerCase().includes(query)),
    };
  }, [collection, folder.id, query]);

  const childFolders = filteredChildFolders;
  const folderRequests = filteredFolderRequests;
  const isExpanded = isSearching || expandedFolders.has(folder.id);
  const allRequestIds = folderRequests.map(r => r.id);

  return (
    <div>
      <div
        data-folder-item
        ref={setFolderDropRef}
        className={`pl-3 pr-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer flex items-center justify-between group ${
          isDragOver || isRequestDragOver ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : ''
        }`}
        onClick={() => toggleFolder(folder.id)}
        onContextMenu={e => openFolderContextMenu(e, collection.id, folder.id, folder.name)}
        {...createFolderDragHandlers(folder.id, collection.id)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
          )}
          <FolderIcon className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-500 shrink-0" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{folder.name}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">({folderRequests.length})</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          <Button onClick={e => { e.stopPropagation(); onCreateFolder(collection.id, folder.id); }} variant="icon" size="sm" title="New Subfolder" className="hover:bg-gray-200">
            <FolderPlus className="w-3 h-3" />
          </Button>
          <Button onClick={e => handleDeleteFolder(collection.id, folder.id, e)} variant="icon" size="sm" title="Delete Folder" className="hover:bg-gray-200">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="ml-4 border-l border-gray-200 dark:border-gray-700">
          {childFolders.map(childFolder => (
            <FolderItem
              key={childFolder.id}
              folder={childFolder}
              collection={collection}
              searchQuery={searchQuery}
              onRenameRequest={onRenameRequest}
              onRenameFolder={onRenameFolder}
              onCreateFolder={onCreateFolder}
            />
          ))}

          <SortableContext items={folderRequests.map(r => r.id)} strategy={verticalListSortingStrategy}>
            {folderRequests.map(request => (
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

      {folderContextMenu && (
        <ContextMenu
          position={{ x: folderContextMenu.x, y: folderContextMenu.y }}
          items={[
            { label: 'Run Folder', icon: <Play className="w-4 h-4" />, onClick: handleRunFolder },
            { label: 'New Subfolder', icon: <FolderPlus className="w-4 h-4" />, onClick: handleNewSubfolderFromContext },
            { label: 'Rename', icon: <FolderIcon className="w-4 h-4" />, onClick: handleRenameFolderFromContext },
            { label: 'Export', icon: <Download className="w-4 h-4" />, onClick: handleExportFolder },
            { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: handleDeleteFolderFromContext, danger: true },
          ]}
          onClose={closeFolderContextMenu}
        />
      )}

      <ConfirmDialog {...confirmDialog.props} />

      <CollectionRunnerDialog
        isOpen={runnerOpen}
        onClose={() => setRunnerOpen(false)}
        collection={collection}
        folderId={folder.id}
      />
    </div>
  );
}
