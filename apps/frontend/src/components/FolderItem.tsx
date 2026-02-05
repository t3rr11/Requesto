import { ChevronRight, ChevronDown, Folder as FolderIcon, FolderPlus, FileText, Trash2, Plus } from 'lucide-react';
import { Folder, Collection, SavedRequest, useCollectionsStore } from '../store/useCollectionsStore';
import { useUIStore } from '../store/useUIStore';
import { useTabsStore } from '../store/useTabsStore';
import { getMethodColor } from '../helpers/collectionHelpers';
import { Button } from './Button';
import { ContextMenu } from './ContextMenu';
import { ConfirmDialog } from './ConfirmDialog';
import { useState } from 'react';
import { useConfirmDialog } from '../hooks/useDialog';

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
  const { moveRequest, moveFolder, setActiveRequest, addFolder, deleteFolder, deleteRequest } = useCollectionsStore();
  const { openRequestTab, getActiveTab } = useTabsStore();
  const activeTab = getActiveTab();
  const activeSavedRequestId = activeTab?.savedRequestId || '';
  const { expandedFolders, toggleFolder, expandFolder } = useUIStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Context menus (local state)
  const [requestContextMenu, setRequestContextMenu] = useState<{ x: number; y: number; request: SavedRequest } | null>(null);
  const [folderContextMenu, setFolderContextMenu] = useState<{ x: number; y: number; collectionId: string; folderId: string; folderName: string } | null>(null);
  
  // Folder management (local state)
  const [newFolderInput, setNewFolderInput] = useState<{ collectionId: string; parentId?: string } | null>(null);
  const [folderName, setFolderName] = useState('');
  
  // Confirm dialog
  const confirmDialog = useConfirmDialog();

  // Handle selecting a request - opens it in a tab
  const handleSelectRequest = (request: SavedRequest) => {
    openRequestTab({
      savedRequestId: request.id,
      collectionId: request.collectionId,
      request: {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: request.body,
        auth: request.auth,
      },
      label: request.name,
    });
    setActiveRequest(request.id);
  };

  // Delete handlers with confirmations
  const handleDeleteRequest = (collectionId: string, requestId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    confirmDialog.open({
      title: 'Delete Request',
      message: 'Are you sure you want to delete this request? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        await deleteRequest(collectionId, requestId);
      },
    });
  };

  const handleDeleteFolder = (collectionId: string, folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    confirmDialog.open({
      title: 'Delete Folder',
      message: 'Are you sure you want to delete this folder and all its contents? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        await deleteFolder(collectionId, folderId);
      },
    });
  };

  // Context menu handlers
  const handleRequestContextMenu = (e: React.MouseEvent, request: SavedRequest) => {
    e.preventDefault();
    e.stopPropagation();
    setRequestContextMenu({ x: e.clientX, y: e.clientY, request });
  };

  const handleFolderContextMenu = (
    e: React.MouseEvent,
    collectionId: string,
    folderId: string,
    folderName: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setFolderContextMenu({ x: e.clientX, y: e.clientY, collectionId, folderId, folderName });
  };
  
  const handleRenameRequestFromContext = () => {
    if (!requestContextMenu) return;
    onRenameRequest(requestContextMenu.request);
    setRequestContextMenu(null);
  };
  
  const handleDeleteRequestFromContext = () => {
    if (!requestContextMenu) return;
    confirmDialog.open({
      title: 'Delete Request',
      message: 'Are you sure you want to delete this request? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        await deleteRequest(requestContextMenu.request.collectionId, requestContextMenu.request.id);
      },
    });
    setRequestContextMenu(null);
  };
  
  const handleRenameFolderFromContext = () => {
    if (!folderContextMenu) return;
    onRenameFolder(folderContextMenu.collectionId, folderContextMenu.folderId, folderContextMenu.folderName);
    setFolderContextMenu(null);
  };
  
  const handleDeleteFolderFromContext = () => {
    if (!folderContextMenu) return;
    confirmDialog.open({
      title: 'Delete Folder',
      message: 'Are you sure you want to delete this folder and all its contents? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        await deleteFolder(folderContextMenu.collectionId, folderContextMenu.folderId);
      },
    });
    setFolderContextMenu(null);
  };
  
  const handleCreateFolder = (collectionId: string, parentId?: string) => {
    setNewFolderInput({ collectionId, parentId });
  };

  const handleSaveFolder = async () => {
    if (!newFolderInput || !folderName.trim()) return;
    await addFolder(newFolderInput.collectionId, folderName.trim(), newFolderInput.parentId);
    
    // Auto-expand the parent after creating folder
    if (newFolderInput.parentId) {
      expandFolder(newFolderInput.parentId);
    }
    
    setNewFolderInput(null);
    setFolderName('');
  };

  const handleCancelFolder = () => {
    setNewFolderInput(null);
    setFolderName('');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const dragType = e.dataTransfer.types[0];
    if (dragType === 'application/request' || dragType === 'application/folder') {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const dragType = e.dataTransfer.types.find(t => t.startsWith('application/'));
    
    if (dragType === 'application/request') {
      const data = JSON.parse(e.dataTransfer.getData('application/request'));
      await moveRequest(data.collectionId, data.requestId, collection.id, folder.id);
    } else if (dragType === 'application/folder') {
      const data = JSON.parse(e.dataTransfer.getData('application/folder'));
      // Prevent dropping a folder into itself
      if (data.folderId !== folder.id) {
        await moveFolder(data.collectionId, data.folderId, collection.id, folder.id);
      }
    }
  };

  const childFolders = (collection.folders || []).filter((f) => f.parentId === folder.id);
  const folderRequests = collection.requests
    .filter((r) => r.folderId === folder.id)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const isExpanded = expandedFolders.has(folder.id);
  const paddingLeft = `${(depth + 1) * 16 + 16}px`;

  return (
    <div>
      {/* Folder Header */}
      <div
        className={`px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex items-center justify-between group ${
          isDragOver ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : ''
        }`}
        style={{ paddingLeft }}
        onClick={() => toggleFolder(folder.id)}
        onContextMenu={(e) => handleFolderContextMenu(e, collection.id, folder.id, folder.name)}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('application/folder', JSON.stringify({
            folderId: folder.id,
            collectionId: collection.id,
          }));
          // Add visual feedback
          (e.target as HTMLElement).style.opacity = '0.5';
        }}
        onDragEnd={(e) => {
          (e.target as HTMLElement).style.opacity = '1';
        }}
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
              handleCreateFolder(collection.id, folder.id);
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

      {/* Folder Contents */}
      {isExpanded && (
        <div>
          {/* New folder input */}
          {newFolderInput?.collectionId === collection.id && newFolderInput?.parentId === folder.id && (
            <div className="px-4 py-2 flex items-center gap-2" style={{ paddingLeft: `${(depth + 2) * 16 + 16}px` }}>
              <FolderIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <input
                type="text"
                value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveFolder();
                  if (e.key === 'Escape') handleCancelFolder();
                }}
                placeholder="Folder name..."
                className="flex-1 px-2 py-1 text-sm border border-blue-300 dark:border-blue-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                autoFocus
              />
              <Button onClick={handleSaveFolder} variant="primary" size="sm">
                Save
              </Button>
              <Button onClick={handleCancelFolder} variant="secondary" size="sm">
                Cancel
              </Button>
            </div>
          )}

          {/* Child folders */}
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

          {/* Requests in this folder */}
          {folderRequests.map((request, index) => (
            <div key={request.id}>
              {/* Drop zone above */}
              <div
                className={`transition-all ${
                  dragOverIndex === index ? 'bg-blue-400 h-1' : 'h-0'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverIndex(index);
                }}
                onDragLeave={() => setDragOverIndex(null)}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverIndex(null);
                  const dragType = e.dataTransfer.types.find(t => t.startsWith('application/'));
                  if (dragType === 'application/request') {
                    const data = JSON.parse(e.dataTransfer.getData('application/request'));
                    await moveRequest(data.collectionId, data.requestId, collection.id, folder.id, index);
                  }
                }}
              />
              
              <div
                className={`px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex items-center justify-between group ${
                  activeSavedRequestId === request.id ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : ''
                }`}
                style={{ paddingLeft: `${(depth + 2) * 16 + 16}px` }}
                onClick={() => handleSelectRequest(request)}
                onContextMenu={(e) => handleRequestContextMenu(e, request)}
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('application/request', JSON.stringify({
                    requestId: request.id,
                    collectionId: collection.id,
                  }));
                  (e.target as HTMLElement).style.opacity = '0.5';
                }}
                onDragEnd={(e) => {
                  (e.target as HTMLElement).style.opacity = '1';
                  setDragOverIndex(null);
                }}
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
              
              {/* Drop zone below (for last item) */}
              {index === folderRequests.length - 1 && (
                <div
                  className={`transition-all ${
                    dragOverIndex === index + 1 ? 'bg-blue-400 h-1' : 'h-0'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverIndex(index + 1);
                  }}
                  onDragLeave={() => setDragOverIndex(null)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverIndex(null);
                    const dragType = e.dataTransfer.types.find(t => t.startsWith('application/'));
                    if (dragType === 'application/request') {
                      const data = JSON.parse(e.dataTransfer.getData('application/request'));
                      await moveRequest(data.collectionId, data.requestId, collection.id, folder.id, index + 1);
                    }
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Context Menus */}
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
          onClose={() => setRequestContextMenu(null)}
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
          onClose={() => setFolderContextMenu(null)}
        />
      )}
      
      {/* Confirm Dialog */}
      <ConfirmDialog {...confirmDialog.props} />
    </div>
  );
};
