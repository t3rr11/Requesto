import { ChevronRight, ChevronDown, Folder as FolderIcon, FolderPlus, FileText, Trash2, Plus } from 'lucide-react';
import { Folder, Collection, SavedRequest } from '../types';
import { useCollectionsStore } from '../store/collections';
import { useUIStore } from '../store/ui';
import { getMethodColor } from '../helpers/collectionHelpers';
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
  onOpenNewRequest: (collectionId?: string, folderId?: string) => void;
  onRenameRequest: (request: SavedRequest) => void;
  onRenameFolder: (collectionId: string, folderId: string, folderName: string) => void;
}

export const FolderItem = ({ 
  folder, 
  collection, 
  depth, 
  onOpenNewRequest,
  onRenameRequest,
  onRenameFolder,
}: FolderItemProps) => {
  const { moveRequest, moveFolder } = useCollectionsStore();
  const { expandedFolders, toggleFolder } = useUIStore();
  
  // Use custom hooks for shared logic
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
    },
    onDropFolder: async (collectionId, folderId) => {
      if (folderId !== folder.id) {
        await moveFolder(collectionId, folderId, collection.id, folder.id);
      }
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

  const childFolders = (collection.folders || []).filter((f) => f.parentId === folder.id);
  const folderRequests = collection.requests
    .filter((r) => r.folderId === folder.id)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const isExpanded = expandedFolders.has(folder.id);
  const paddingLeft = `${(depth + 1) * 16 + 16}px`;

  return (
    <div>
      <div
        className={`px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex items-center justify-between group ${
          isDragOver ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : ''
        }`}
        style={{ paddingLeft }}
        onClick={() => toggleFolder(folder.id)}
        onContextMenu={(e) => openFolderContextMenu(e, collection.id, folder.id, folder.name)}
        {...createFolderDragHandlers(folder.id, collection.id)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          )}
          <FolderIcon className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{folder.name}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">({folderRequests.length})</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onOpenNewRequest(collection.id, folder.id);
            }}
            variant="icon"
            size="sm"
            title="Add Request"
          >
            <Plus className="w-3 h-3" />
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              startCreateFolder(collection.id, folder.id);
            }}
            variant="icon"
            size="sm"
            title="New Subfolder"
          >
            <FolderPlus className="w-3 h-3" />
          </Button>
          <Button
            onClick={(e) => handleDeleteFolder(collection.id, folder.id, e)}
            variant="icon"
            size="sm"
            title="Delete Folder"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div>
          {newFolderInput?.collectionId === collection.id && newFolderInput?.parentId === folder.id && (
            <div className="px-4 py-2 flex items-center gap-2" style={{ paddingLeft: `${(depth + 2) * 16 + 16}px` }}>
              <FolderIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <input
                type="text"
                value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveFolder(collection.id);
                  if (e.key === 'Escape') handleCancelFolder();
                }}
                placeholder="Folder name..."
                className="flex-1 px-2 py-1 text-sm border border-blue-300 dark:border-blue-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                autoFocus
              />
              <Button onClick={() => handleSaveFolder(collection.id)} variant="primary" size="sm">
                Save
              </Button>
              <Button onClick={handleCancelFolder} variant="secondary" size="sm">
                Cancel
              </Button>
            </div>
          )}

          {childFolders.map((childFolder) => (
            <FolderItem
              key={childFolder.id}
              folder={childFolder}
              collection={collection}
              depth={depth + 1}
              onOpenNewRequest={onOpenNewRequest}
              onRenameRequest={onRenameRequest}
              onRenameFolder={onRenameFolder}
            />
          ))}

          {folderRequests.map((request, index) => (
            <div key={request.id}>
              <div
                className={`transition-all ${
                  dragOverIndex === index ? 'bg-blue-400 h-1' : 'h-0'
                }`}
                onDragOver={(e) => handleDragOverIndex(e, index)}
                onDragLeave={handleDragLeaveIndex}
                onDrop={(e) => handleDropAtIndex(e, index)}
              />
              
              <div
                className={`px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex items-center justify-between group ${
                  activeSavedRequestId === request.id ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : ''
                }`}
                style={{ paddingLeft: `${(depth + 2) * 16 + 16}px` }}
                onClick={() => handleSelectRequest(request)}
                onContextMenu={(e) => openRequestContextMenu(e, request)}
                {...createRequestDragHandlers(request.id, collection.id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span className={`text-xs font-medium ${getMethodColor(request.method)} min-w-[45px]`}>
                    {request.method}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{request.name}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteRequest(collection.id, request.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all"
                  title="Delete Request"
                >
                  <Trash2 className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              
              {index === folderRequests.length - 1 && (
                <div
                  className={`transition-all ${
                    dragOverIndex === index + 1 ? 'bg-blue-400 h-1' : 'h-0'
                  }`}
                  onDragOver={(e) => handleDragOverIndex(e, index + 1)}
                  onDragLeave={handleDragLeaveIndex}
                  onDrop={(e) => handleDropAtIndex(e, index + 1)}
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
            {
              label: 'Rename',
              icon: <FileText className="w-4 h-4" />,
              onClick: handleRenameRequestFromContext,
            },
            {
              label: 'Delete',
              icon: <Trash2 className="w-4 h-4" />,
              onClick: handleDeleteRequestFromContext,
              danger: true,
            },
          ]}
          onClose={closeRequestContextMenu}
        />
      )}
      
      {folderContextMenu && (
        <ContextMenu
          position={{ x: folderContextMenu.x, y: folderContextMenu.y }}
          items={[
            {
              label: 'Rename',
              icon: <FolderIcon className="w-4 h-4" />,
              onClick: handleRenameFolderFromContext,
            },
            {
              label: 'Delete',
              icon: <Trash2 className="w-4 h-4" />,
              onClick: handleDeleteFolderFromContext,
              danger: true,
            },
          ]}
          onClose={closeFolderContextMenu}
        />
      )}
      
      <ConfirmDialog {...confirmDialog.props} />
    </div>
  );
};
