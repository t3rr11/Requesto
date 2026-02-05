import { useState } from 'react';
import { useCollectionsStore } from '../store/collections';
import { useUIStore } from '../store/ui';
import { useTabsStore } from '../store/tabs';
import { useConfirmDialog } from './useDialog';
import { SavedRequest } from '../types';

/**
 * Hook for managing common actions on collections, folders, and requests
 * Includes folder creation, deletion, and request selection
 */
export const useItemActions = () => {
  const { addFolder, deleteCollection, deleteFolder, deleteRequest, setActiveRequest } = useCollectionsStore();
  const { expandFolder, expandCollection } = useUIStore();
  const { openRequestTab, getActiveTab } = useTabsStore();
  const confirmDialog = useConfirmDialog();

  // Folder creation state
  const [newFolderInput, setNewFolderInput] = useState<{
    collectionId: string;
    parentId?: string;
  } | null>(null);
  const [folderName, setFolderName] = useState('');

  // Get active request ID for highlighting
  const activeTab = getActiveTab();
  const activeSavedRequestId = activeTab?.savedRequestId || '';

  // Select and open a request in a tab
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
  const handleDeleteCollection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    confirmDialog.open({
      title: 'Delete Collection',
      message: 'Are you sure you want to delete this collection and all its requests? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        await deleteCollection(id);
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

  // Folder management
  const startCreateFolder = (collectionId: string, parentId?: string) => {
    setNewFolderInput({ collectionId, parentId });
  };

  const handleSaveFolder = async (collectionId: string) => {
    if (!newFolderInput || !folderName.trim()) return;

    await addFolder(newFolderInput.collectionId, folderName.trim(), newFolderInput.parentId);

    // Auto-expand the parent after creating folder
    if (newFolderInput.parentId) {
      expandFolder(newFolderInput.parentId);
    } else {
      expandCollection(collectionId);
    }

    setNewFolderInput(null);
    setFolderName('');
  };

  const handleCancelFolder = () => {
    setNewFolderInput(null);
    setFolderName('');
  };

  return {
    // Folder creation state
    newFolderInput,
    folderName,
    setFolderName,
    startCreateFolder,
    handleSaveFolder,
    handleCancelFolder,
    
    // Active state
    activeSavedRequestId,
    
    // Action handlers
    handleSelectRequest,
    handleDeleteCollection,
    handleDeleteFolder,
    handleDeleteRequest,
    
    // Confirm dialog
    confirmDialog,
  };
};
