import { ChevronRight, ChevronDown, Folder as FolderIcon, FolderPlus, FileText, Trash2, Plus } from 'lucide-react';
import { Folder, Collection, SavedRequest, useCollectionsStore } from '../store/useCollectionsStore';
import { useCollectionsSidebarStore } from '../store/useCollectionsSidebarStore';
import { useUIStore } from '../store/useUIStore';
import { getMethodColor } from '../helpers/collectionHelpers';
import { useState } from 'react';

interface FolderItemProps {
  folder: Folder;
  collection: Collection;
  depth: number;
  onSelectRequest: (request: SavedRequest) => void;
  onDeleteRequest: (collectionId: string, requestId: string, e: React.MouseEvent) => void;
  onRequestContextMenu: (e: React.MouseEvent, request: SavedRequest) => void;
  onDeleteFolder: (collectionId: string, folderId: string, e: React.MouseEvent) => void;
}

export const FolderItem = ({
  folder,
  collection,
  depth,
  onSelectRequest,
  onDeleteRequest,
  onRequestContextMenu,
  onDeleteFolder,
}: FolderItemProps) => {
  const { activeRequestId, expandedFolders, toggleFolder, addFolder, moveRequest, moveFolder } = useCollectionsStore();
  const { newFolderInput, folderName, setNewFolderInput, setFolderName } = useCollectionsSidebarStore();
  const { openNewRequest } = useUIStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  const handleCreateFolder = (collectionId: string, parentId?: string) => {
    setNewFolderInput({ collectionId, parentId });
  };
  
  const handleSaveFolder = async () => {
    if (!newFolderInput || !folderName.trim()) return;
    await addFolder(newFolderInput.collectionId, folderName.trim(), newFolderInput.parentId);
    setNewFolderInput(null);
  };
  
  const handleCancelFolder = () => {
    setNewFolderInput(null);
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
        className={`px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between group ${
          isDragOver ? 'bg-blue-50 border-l-2 border-blue-500' : ''
        }`}
        style={{ paddingLeft }}
        onClick={() => toggleFolder(folder.id)}
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
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          )}
          <FolderIcon className="w-3.5 h-3.5 text-yellow-600 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-700 truncate">{folder.name}</span>
          <span className="text-xs text-gray-400">({folderRequests.length})</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openNewRequest(collection.id, folder.id);
            }}
            className="p-1 hover:bg-gray-200 rounded transition-all"
            title="Add Request"
          >
            <Plus className="w-3 h-3 text-gray-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCreateFolder(collection.id, folder.id);
            }}
            className="p-1 hover:bg-gray-200 rounded transition-all"
            title="New Subfolder"
          >
            <FolderPlus className="w-3 h-3 text-gray-500" />
          </button>
          <button
            onClick={(e) => onDeleteFolder(collection.id, folder.id, e)}
            className="p-1 hover:bg-gray-200 rounded transition-all"
            title="Delete Folder"
          >
            <Trash2 className="w-3 h-3 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Folder Contents */}
      {isExpanded && (
        <div>
          {/* New folder input */}
          {newFolderInput?.collectionId === collection.id && newFolderInput?.parentId === folder.id && (
            <div className="px-4 py-2 flex items-center gap-2" style={{ paddingLeft: `${(depth + 2) * 16 + 16}px` }}>
              <FolderIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveFolder();
                  if (e.key === 'Escape') handleCancelFolder();
                }}
                placeholder="Folder name..."
                className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <button onClick={handleSaveFolder} className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                Save
              </button>
              <button onClick={handleCancelFolder} className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">
                Cancel
              </button>
            </div>
          )}

          {/* Child folders */}
          {childFolders.map((childFolder) => (
            <FolderItem
              key={childFolder.id}
              folder={childFolder}
              collection={collection}
              depth={depth + 1}
              onSelectRequest={onSelectRequest}
              onDeleteRequest={onDeleteRequest}
              onRequestContextMenu={onRequestContextMenu}
              onDeleteFolder={onDeleteFolder}
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
                className={`px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between group ${
                  activeRequestId === request.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                }`}
                style={{ paddingLeft: `${(depth + 2) * 16 + 16}px` }}
                onClick={() => onSelectRequest(request)}
                onContextMenu={(e) => onRequestContextMenu(e, request)}
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
                  <FileText className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className={`text-xs font-medium ${getMethodColor(request.method)} min-w-[45px]`}>
                    {request.method}
                  </span>
                  <span className="text-sm text-gray-700 truncate">{request.name}</span>
                </div>
                <button
                  onClick={(e) => onDeleteRequest(collection.id, request.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all"
                  title="Delete Request"
                >
                  <Trash2 className="w-3 h-3 text-gray-500" />
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
    </div>
  );
};
