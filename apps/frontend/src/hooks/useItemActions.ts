import { useCollectionsStore } from '../store/collections/store';
import { useTabsStore } from '../store/tabs/store';
import { useConfirmDialog } from './useDialog';
import type { SavedRequest } from '../store/collections/types';

export function useItemActions() {
  const { deleteCollection, deleteFolder, deleteRequest, setActiveRequest } = useCollectionsStore();
  const { openRequestTab, getActiveTab } = useTabsStore();
  const confirmDialog = useConfirmDialog();

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
        preRequestScript: request.preRequestScript,
        testScript: request.testScript,
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

  return {
    activeSavedRequestId,
    handleSelectRequest,
    handleDeleteCollection,
    handleDeleteFolder,
    handleDeleteRequest,
    confirmDialog,
  };
}
