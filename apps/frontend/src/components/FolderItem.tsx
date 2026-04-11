import { useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder as FolderIcon,
  FolderPlus,
  FileText,
  Trash2,
  Plus,
  Download,
} from 'lucide-react';
import type { Folder, Collection, SavedRequest } from '../store/collections/types';
import { useCollectionsStore } from '../store/collections/store';
import { useUIStore } from '../store/ui/store';
import { useAlertStore } from '../store/alert/store';
import { getMethodColor } from '../helpers/collections';
import { Button } from './Button';
import { ContextMenu } from './ContextMenu';
import { ConfirmDialog } from './ConfirmDialog';
import { useItemContextMenu } from '../hooks/useItemContextMenu';
import { useItemDragDrop } from '../hooks/useItemDragDrop';
import { useItemActions } from '../hooks/useItemActions';

interface FolderItemProps {
  folder: Folder;
  collection: Collection;
  depth: number;
  searchQuery?: string;
  onOpenNewRequest: (collectionId?: string, folderId?: string) => void;
  onRenameRequest: (request: SavedRequest) => void;
  onRenameFolder: (collectionId: string, folderId: string, folderName: string) => void;
}

export function FolderItem({
  folder,
  collection,
  depth,
  searchQuery,
  onOpenNewRequest,
  onRenameRequest,
  onRenameFolder,
}: FolderItemProps) {
  const { moveRequest, moveFolder, exportRequest, exportFolder } = useCollectionsStore();
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
    newFolderInput,
    folderName,
    setFolderName,
    startCreateFolder,
    handleSaveFolder,
    handleCancelFolder,
    activeSavedRequestId,
    handleSelectRequest,
    handleDeleteFolder,
    handleDeleteRequest,
    confirmDialog,
  } = useItemActions();

  const {
    isDragOver,
    dragOverIndex,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragOverIndex,
    handleDragLeaveIndex,
    handleDropAtIndex,
    createRequestDragHandlers,
    createFolderDragHandlers,
  } = useItemDragDrop({
    onDropRequest: async (collectionId, requestId, targetOrder) => {
      await moveRequest(collectionId, requestId, collection.id, folder.id, targetOrder);
      clearSelection();
    },
    onDropFolder: async (collectionId, folderId) => {
      if (folderId !== folder.id) {
        await moveFolder(collectionId, folderId, collection.id, folder.id);
      }
    },
    onDropMultipleRequests: async (requests, targetOrder) => {
      for (const req of requests) {
        await moveRequest(req.collectionId, req.requestId, collection.id, folder.id, targetOrder);
      }
      clearSelection();
    },
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

  const isSearching = !!searchQuery?.trim();
  const query = searchQuery?.toLowerCase() ?? '';

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
  const paddingLeft = `${(depth + 1) * 16 + 16}px`;
  const allRequestIds = folderRequests.map(r => r.id);

  return (
    <div>
      <div
        data-folder-item
        className={`px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer flex items-center justify-between group ${
          isDragOver ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : ''
        }`}
        style={{ paddingLeft }}
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
          <Button onClick={e => { e.stopPropagation(); onOpenNewRequest(collection.id, folder.id); }} variant="icon" size="sm" title="Add Request" className="hover:bg-gray-200">
            <Plus className="w-3 h-3" />
          </Button>
          <Button onClick={e => { e.stopPropagation(); startCreateFolder(collection.id, folder.id); }} variant="icon" size="sm" title="New Subfolder" className="hover:bg-gray-200">
            <FolderPlus className="w-3 h-3" />
          </Button>
          <Button onClick={e => handleDeleteFolder(collection.id, folder.id, e)} variant="icon" size="sm" title="Delete Folder" className="hover:bg-gray-200">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div>
          {newFolderInput?.collectionId === collection.id && newFolderInput?.parentId === folder.id && (
            <div className="px-4 py-2 flex items-center gap-2" style={{ paddingLeft: `${(depth + 2) * 16 + 16}px` }}>
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

          {childFolders.map(childFolder => (
            <FolderItem
              key={childFolder.id}
              folder={childFolder}
              collection={collection}
              depth={depth + 1}
              searchQuery={searchQuery}
              onOpenNewRequest={onOpenNewRequest}
              onRenameRequest={onRenameRequest}
              onRenameFolder={onRenameFolder}
            />
          ))}

          {folderRequests.map((request, index) => (
            <div key={request.id}>
              <div
                className={`transition-all ${dragOverIndex === index ? 'bg-blue-400 h-1' : 'h-0'}`}
                onDragOver={e => handleDragOverIndex(e, index)}
                onDragLeave={handleDragLeaveIndex}
                onDrop={e => handleDropAtIndex(e, index)}
              />
              <div
                data-request-item
                className={`px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex items-center justify-between group ${
                  activeSavedRequestId === request.id ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : ''
                } ${selectedRequestIds.has(request.id) ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : ''}`}
                style={{ paddingLeft: `${(depth + 2) * 16 + 16}px` }}
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
                  <FileText className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0" />
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
              {index === folderRequests.length - 1 && (
                <div
                  className={`transition-all ${dragOverIndex === index + 1 ? 'bg-blue-400 h-1' : 'h-0'}`}
                  onDragOver={e => handleDragOverIndex(e, index + 1)}
                  onDragLeave={handleDragLeaveIndex}
                  onDrop={e => handleDropAtIndex(e, index + 1)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {requestContextMenu && (
        <ContextMenu
          position={{ x: requestContextMenu.x, y: requestContextMenu.y }}
          items={[
            { label: 'Rename', icon: <FileText className="w-4 h-4" />, onClick: handleRenameRequestFromContext },
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
            { label: 'Rename', icon: <FolderIcon className="w-4 h-4" />, onClick: handleRenameFolderFromContext },
            { label: 'Export', icon: <Download className="w-4 h-4" />, onClick: handleExportFolder },
            { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: handleDeleteFolderFromContext, danger: true },
          ]}
          onClose={closeFolderContextMenu}
        />
      )}

      <ConfirmDialog {...confirmDialog.props} />
    </div>
  );
}
