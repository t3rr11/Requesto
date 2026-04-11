import { useState } from 'react';
import { useCollectionsStore } from '../store/collections/store';
import { useUIStore } from '../store/ui/store';
import { useTabsStore } from '../store/tabs/store';
import { useConfirmDialog } from './useDialog';
import type { SavedRequest } from '../store/collections/types';

export function useItemActions() {
  const { addFolder, deleteCollection, deleteFolder, deleteRequest, setActiveRequest } = useCollectionsStore();
  const { expandFolder, expandCollection } = useUIStore();
  const { openRequestTab, getActiveTab } = useTabsStore();
  const confirmDialog = useConfirmDialog();

  const [newFolderInput, setNewFolderInput] = useState<{
    collectionId: string;
    parentId?: string;
  } | null>(null);
  const [folderName, setFolderName] = useState('');

  const activeTab = getActiveTab();
  const activeSavedRequestId = activeTab?.savedRequestId || '';

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

  const handleDeleteCollection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    confirmDialog.open({
      title: 'Delete Collection',
      message: 'Are you sure you want to delete this collection and all its requests? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => deleteCollection(id),
    });
  };

  const handleDeleteFolder = (collectionId: string, folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    confirmDialog.open({
      title: 'Delete Folder',
      message: 'Are you sure you want to delete this folder and all its contents? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => deleteFolder(collectionId, folderId),
    });
  };

  const handleDeleteRequest = (collectionId: string, requestId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    confirmDialog.open({
      title: 'Delete Request',
      message: 'Are you sure you want to delete this request? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => deleteRequest(collectionId, requestId),
    });
  };

  const startCreateFolder = (collectionId: string, parentId?: string) => {
    setNewFolderInput({ collectionId, parentId });
  };

  const handleSaveFolder = async (collectionId: string) => {
    if (!newFolderInput || !folderName.trim()) return;

    await addFolder(newFolderInput.collectionId, folderName.trim(), newFolderInput.parentId);

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
    newFolderInput,
    folderName,
    setFolderName,
    startCreateFolder,
    handleSaveFolder,
    handleCancelFolder,
    activeSavedRequestId,
    handleSelectRequest,
    handleDeleteCollection,
    handleDeleteFolder,
    handleDeleteRequest,
    confirmDialog,
  };
}
