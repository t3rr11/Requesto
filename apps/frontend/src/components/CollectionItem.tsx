import { ChevronRight, ChevronDown, Folder as FolderIcon, FolderPlus, FileText, Trash2, Plus } from 'lucide-react';
import { Collection, SavedRequest, useCollectionsStore } from '../store/useCollectionsStore';
import { useCollectionsSidebarStore } from '../store/useCollectionsSidebarStore';
import { useUIStore } from '../store/useUIStore';
import { useTabsStore } from '../store/useTabsStore';
import { FolderItem } from './FolderItem';
import { getMethodColor } from '../helpers/collectionHelpers';
import React, { useState } from 'react';

interface CollectionItemProps {
  collection: Collection;
  onSelectRequest: (request: SavedRequest) => void;
  onDeleteCollection: (id: string, e: React.MouseEvent) => void;
  onDeleteRequest: (collectionId: string, requestId: string, e: React.MouseEvent) => void;
  onDeleteFolder: (collectionId: string, folderId: string, e: React.MouseEvent) => void;
  onRequestContextMenu: (e: React.MouseEvent, request: SavedRequest) => void;
  onCollectionContextMenu: (e: React.MouseEvent, collectionId: string, collectionName: string) => void;
  onFolderContextMenu: (e: React.MouseEvent, collectionId: string, folderId: string, folderName: string) => void;
}

export const CollectionItem = ({
  collection,
  onSelectRequest,
  onDeleteCollection,
  onDeleteRequest,
  onDeleteFolder,
  onRequestContextMenu,
  onCollectionContextMenu,
  onFolderContextMenu,
}: CollectionItemProps) => {
  const { addFolder, moveRequest } = useCollectionsStore();
  const { getActiveTab } = useTabsStore();
  const activeTab = getActiveTab();
  const activeSavedRequestId = activeTab?.savedRequestId || '';
  const { newFolderInput, folderName, setNewFolderInput, setFolderName } = useCollectionsSidebarStore();
  const { openNewRequest, expandedCollections, toggleCollection, expandCollection } = useUIStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const isExpanded = expandedCollections.has(collection.id);

  const handleCreateFolder = (collectionId: string, parentId?: string) => {
    setNewFolderInput({ collectionId, parentId });
  };

  const handleSaveFolder = async () => {
    if (!newFolderInput || !folderName.trim()) return;
    await addFolder(newFolderInput.collectionId, folderName.trim(), newFolderInput.parentId);

    // Auto-expand the parent after creating folder
    if (newFolderInput.parentId) {
      const { expandFolder } = useUIStore.getState();
      expandFolder(newFolderInput.parentId);
    } else {
      expandCollection(collection.id);
    }

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
      // Allow moving to root of same collection (e.g., from folder to collection root)
      // or to a different collection
      await moveRequest(data.collectionId, data.requestId, collection.id, undefined);
    } else if (dragType === 'application/folder') {
      const data = JSON.parse(e.dataTransfer.getData('application/folder'));
      // Prevent dropping a folder into itself or staying in same position
      if (data.folderId !== collection.id) {
        const { moveFolder } = useCollectionsStore.getState();
        await moveFolder(data.collectionId, data.folderId, collection.id, undefined);
      }
    }
  };

  const rootFolders = (collection.folders || []).filter(f => !f.parentId);
  const rootRequests = collection.requests.filter(r => !r.folderId).sort((a, b) => (a.order || 0) - (b.order || 0));
  const totalItems = collection.requests.length;

  return (
    <div className="mb-1">
      {/* Collection Header */}
      <div
        className={`px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex items-center justify-between group ${
          isDragOver ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : ''
        }`}
        onClick={() => toggleCollection(collection.id)}
        onContextMenu={e => onCollectionContextMenu(e, collection.id, collection.name)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          )}
          <FolderIcon className="w-4 h-4 text-orange-500 dark:text-orange-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{collection.name}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">({totalItems})</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          <button
            onClick={e => {
              e.stopPropagation();
              openNewRequest(collection.id);
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all"
            title="Add Request"
          >
            <Plus className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              handleCreateFolder(collection.id);
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all"
            title="New Folder"
          >
            <FolderPlus className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          </button>
          <button
            onClick={e => onDeleteCollection(collection.id, e)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all"
            title="Delete Collection"
          >
            <Trash2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Collection Contents */}
      {isExpanded && (
        <div>
          {/* New folder input at root level */}
          {newFolderInput?.collectionId === collection.id && !newFolderInput?.parentId && (
            <div className="px-4 py-2 flex items-center gap-2 ml-6">
              <FolderIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <input
                type="text"
                value={folderName}
                onChange={e => setFolderName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveFolder();
                  if (e.key === 'Escape') handleCancelFolder();
                }}
                placeholder="Folder name..."
                className="flex-1 px-2 py-1 text-sm border border-blue-300 dark:border-blue-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                autoFocus
              />
              <button
                onClick={handleSaveFolder}
                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Save
              </button>
              <button onClick={handleCancelFolder} className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 dark:text-gray-200">
                Cancel
              </button>
            </div>
          )}

          {/* Root folders */}
          {rootFolders.map(folder => (
            <FolderItem
              key={folder.id}
              folder={folder}
              collection={collection}
              depth={0}
              onSelectRequest={onSelectRequest}
              onDeleteRequest={onDeleteRequest}
              onRequestContextMenu={onRequestContextMenu}
              onDeleteFolder={onDeleteFolder}
              onFolderContextMenu={onFolderContextMenu}
            />
          ))}

          {/* Root requests (not in any folder) */}
          {rootRequests.length === 0 && rootFolders.length === 0 ? (
            <div className="px-4 py-2 text-xs text-gray-400 italic ml-6">No requests yet</div>
          ) : (
            rootRequests.map((request, index) => (
              <div key={request.id}>
                {/* Drop zone above */}
                <div
                  className={`transition-all ${dragOverIndex === index ? 'bg-blue-400 h-1' : 'h-0'}`}
                  onDragOver={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverIndex(index);
                  }}
                  onDragLeave={() => setDragOverIndex(null)}
                  onDrop={async e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverIndex(null);
                    const dragType = e.dataTransfer.types.find(t => t.startsWith('application/'));
                    if (dragType === 'application/request') {
                      const data = JSON.parse(e.dataTransfer.getData('application/request'));
                      await moveRequest(data.collectionId, data.requestId, collection.id, undefined, index);
                    }
                  }}
                />

                <div
                className={`px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex items-center justify-between group ${
                  activeSavedRequestId === request.id ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' : ''
                  }`}
                  style={{ paddingLeft: '32px' }}
                  onClick={() => onSelectRequest(request)}
                  onContextMenu={e => onRequestContextMenu(e, request)}
                  draggable
                  onDragStart={e => {
                    e.stopPropagation();
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData(
                      'application/request',
                      JSON.stringify({
                        requestId: request.id,
                        collectionId: collection.id,
                      })
                    );
                    (e.target as HTMLElement).style.opacity = '0.5';
                  }}
                  onDragEnd={e => {
                    (e.target as HTMLElement).style.opacity = '1';
                    setDragOverIndex(null);
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span className={`text-xs font-medium ${getMethodColor(request.method)} min-w-[45px]`}>
                    {request.method}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{request.name}</span>
                </div>
                <button
                  onClick={e => onDeleteRequest(collection.id, request.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all"
                  title="Delete Request"
                >
                  <Trash2 className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>

                {/* Drop zone below (for last item) */}
                {index === rootRequests.length - 1 && (
                  <div
                    className={`transition-all ${dragOverIndex === index + 1 ? 'bg-blue-400 h-1' : 'h-0'}`}
                    onDragOver={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverIndex(index + 1);
                    }}
                    onDragLeave={() => setDragOverIndex(null)}
                    onDrop={async e => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverIndex(null);
                      const dragType = e.dataTransfer.types.find(t => t.startsWith('application/'));
                      if (dragType === 'application/request') {
                        const data = JSON.parse(e.dataTransfer.getData('application/request'));
                        await moveRequest(data.collectionId, data.requestId, collection.id, undefined, index + 1);
                      }
                    }}
                  />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
