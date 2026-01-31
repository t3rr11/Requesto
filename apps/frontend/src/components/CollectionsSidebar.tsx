import { useState, useRef, useEffect } from 'react';
import { Folder as FolderIcon, FolderPlus, Plus, Edit, Trash2 } from 'lucide-react';
import { useUIStore } from '../store/useUIStore';
import { useCollectionsStore, SavedRequest } from '../store/useCollectionsStore';
import { useCollectionsSidebarStore } from '../store/useCollectionsSidebarStore';
import { useTabsStore } from '../store/useTabsStore';
import { ConfirmDialog } from './ConfirmDialog';
import { ContextMenu } from './ContextMenu';
import { RenameForm } from '../forms/RenameForm';
import { CollectionItem } from './CollectionItem';

export const CollectionsSidebar = () => {
  const { isSidebarOpen, sidebarWidth, setSidebarWidth, openNewCollection } = useUIStore();
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const {
    collections,
    loading,
    setActiveRequest,
    deleteCollection,
    deleteFolder,
    deleteRequest,
    updateCollection,
    updateRequest,
  } = useCollectionsStore();
  const { openRequestTab } = useTabsStore();
  const {
    confirmDialog,
    setConfirmDialog,
    closeConfirmDialog,
    requestContextMenu,
    setRequestContextMenu,
    collectionContextMenu,
    setCollectionContextMenu,
    renameRequest,
    setRenameRequest,
    renameCollection,
    setRenameCollection,
  } = useCollectionsSidebarStore();

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !sidebarRef.current) return;

      const newWidth = e.clientX;
      const clampedWidth = Math.max(200, Math.min(newWidth, 600));
      setSidebarWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setSidebarWidth]);

  const handleSelectRequest = (request: SavedRequest) => {
    // Open request in a tab (or focus existing tab)
    openRequestTab({
      savedRequestId: request.id,
      collectionId: request.collectionId,
      request: {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: request.body,
      },
      label: request.name,
    });
    
    // Keep for backwards compatibility with any components still using this
    setActiveRequest(request.id);
  };

  const handleDeleteCollection = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Collection',
      message: 'Are you sure you want to delete this collection and all its requests? This action cannot be undone.',
      onConfirm: async () => {
        await deleteCollection(id);
        closeConfirmDialog();
      },
    });
  };

  const handleDeleteFolder = async (collectionId: string, folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Folder',
      message: 'Are you sure you want to delete this folder and all its contents? This action cannot be undone.',
      onConfirm: async () => {
        await deleteFolder(collectionId, folderId);
        closeConfirmDialog();
      },
    });
  };

  const handleDeleteRequest = async (collectionId: string, requestId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Request',
      message: 'Are you sure you want to delete this request? This action cannot be undone.',
      onConfirm: async () => {
        await deleteRequest(collectionId, requestId);
        closeConfirmDialog();
      },
    });
  };

  const handleRequestContextMenu = (e: React.MouseEvent, request: SavedRequest) => {
    e.preventDefault();
    e.stopPropagation();
    setRequestContextMenu({ x: e.clientX, y: e.clientY, request });
  };

  const handleCollectionContextMenu = (e: React.MouseEvent, collectionId: string, collectionName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCollectionContextMenu({ x: e.clientX, y: e.clientY, collectionId, collectionName });
  };

  const handleRenameRequest = (request: SavedRequest) => {
    setRenameRequest({ request });
    setRequestContextMenu(null);
  };

  const handleRenameCollection = (collectionId: string, collectionName: string) => {
    setRenameCollection({ id: collectionId, name: collectionName });
    setCollectionContextMenu(null);
  };

  const handleSaveRequestRename = async (newName: string) => {
    if (!renameRequest) return;

    await updateRequest(renameRequest.request.collectionId, renameRequest.request.id, { name: newName });
    setRenameRequest(null);
  };

  const handleSaveCollectionRename = async (newName: string) => {
    if (!renameCollection) return;

    await updateCollection(renameCollection.id, { name: newName });
    setRenameCollection(null);
  };

  const handleDeleteRequestFromContext = async () => {
    if (!requestContextMenu) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Request',
      message: 'Are you sure you want to delete this request? This action cannot be undone.',
      onConfirm: async () => {
        await deleteRequest(
          requestContextMenu.request.collectionId,
          requestContextMenu.request.id
        );
        closeConfirmDialog();
      },
    });
    setRequestContextMenu(null);
  };

  const handleDeleteCollectionFromContext = async () => {
    if (!collectionContextMenu) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Collection',
      message: 'Are you sure you want to delete this collection and all its requests? This action cannot be undone.',
      onConfirm: async () => {
        await deleteCollection(collectionContextMenu.collectionId);
        closeConfirmDialog();
      },
    });
    setCollectionContextMenu(null);
  };

  const handleNewRequest = () => {
    // Open a new empty tab
    openRequestTab({
      savedRequestId: '',
      collectionId: '',
      request: { method: 'GET', url: '' },
      label: 'New Request'
    });
  };

  if (!isSidebarOpen) return null;

  return (
    <div 
      ref={sidebarRef}
      className="bg-white border-r border-gray-200 flex flex-col h-full relative"
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Collections</h2>
          <div className="flex gap-2">
            <button
              onClick={handleNewRequest}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="New Request"
            >
              <Plus className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={openNewCollection}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="New Collection"
            >
              <FolderPlus className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Collections List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading collections...</div>
        ) : collections.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <FolderIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No collections yet</p>
            <p className="text-xs text-gray-400 mt-1">Create one to organize your requests</p>
          </div>
        ) : (
          <div className="py-2">
            {collections.map((collection) => (
              <CollectionItem
                key={collection.id}
                collection={collection}
                onSelectRequest={handleSelectRequest}
                onDeleteCollection={handleDeleteCollection}
                onDeleteRequest={handleDeleteRequest}
                onDeleteFolder={handleDeleteFolder}
                onRequestContextMenu={handleRequestContextMenu}
                onCollectionContextMenu={handleCollectionContextMenu}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mb-9 p-3 border-t border-gray-200 text-xs text-gray-500">
        {collections.length} {collections.length === 1 ? 'collection' : 'collections'}
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Delete"
        variant="danger"
      />

      {/* Request Context Menu */}
      {requestContextMenu && (
        <ContextMenu
          position={{ x: requestContextMenu.x, y: requestContextMenu.y }}
          items={[
            {
              label: 'Rename',
              icon: <Edit className="w-4 h-4" />,
              onClick: () => handleRenameRequest(requestContextMenu.request),
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

      {/* Collection Context Menu */}
      {collectionContextMenu && (
        <ContextMenu
          position={{ x: collectionContextMenu.x, y: collectionContextMenu.y }}
          items={[
            {
              label: 'Rename',
              icon: <Edit className="w-4 h-4" />,
              onClick: () => handleRenameCollection(collectionContextMenu.collectionId, collectionContextMenu.collectionName),
            },
            {
              label: 'Delete',
              icon: <Trash2 className="w-4 h-4" />,
              onClick: handleDeleteCollectionFromContext,
              danger: true,
            },
          ]}
          onClose={() => setCollectionContextMenu(null)}
        />
      )}

      {/* Rename Request Form */}
      {renameRequest && (
        <RenameForm
          isOpen={true}
          onClose={() => setRenameRequest(null)}
          onSave={handleSaveRequestRename}
          currentName={renameRequest.request.name}
          title="Rename Request"
          label="Request Name"
        />
      )}

      {/* Rename Collection Form */}
      {renameCollection && (
        <RenameForm
          isOpen={true}
          onClose={() => setRenameCollection(null)}
          onSave={handleSaveCollectionRename}
          currentName={renameCollection.name}
          title="Rename Collection"
          label="Collection Name"
          placeholder="Enter collection name..."
        />
      )}

      {/* Resize Handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full bg-transparent hover:bg-orange-500 cursor-ew-resize transition-colors"
        onMouseDown={handleMouseDown}
        title="Drag to resize"
      />
    </div>
  );
};