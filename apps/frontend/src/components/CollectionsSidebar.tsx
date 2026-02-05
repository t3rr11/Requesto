import { useState, useRef, useEffect } from 'react';
import { Folder as FolderIcon, FolderPlus, Plus } from 'lucide-react';
import { useUIStore } from '../store/ui';
import { useCollectionsStore } from '../store/collections';
import { SavedRequest } from '../types';
import { useTabsStore } from '../store/tabs';
import { Dialog } from './Dialog';
import { RenameForm } from '../forms/RenameForm';
import { NewCollectionForm } from '../forms/NewCollectionForm';
import { NewRequestForm } from '../forms/NewRequestForm';
import { CollectionItem } from './CollectionItem';
import { Button } from './Button';
import { useDialog, useDialogWithData } from '../hooks/useDialog';

interface RenameRequestData {
  request: SavedRequest;
}

interface RenameCollectionData {
  id: string;
  name: string;
}

interface RenameFolderData {
  collectionId: string;
  id: string;
  name: string;
}

interface NewRequestContext {
  collectionId?: string;
  folderId?: string;
}

export const CollectionsSidebar = () => {
  const { isSidebarOpen, sidebarWidth, setSidebarWidth } = useUIStore();
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { collections, loading } = useCollectionsStore();
  const { openRequestTab } = useTabsStore();
  
  // Dialog hooks
  const newCollectionDialog = useDialog();
  const newRequestDialog = useDialogWithData<NewRequestContext>();
  const renameRequestDialog = useDialogWithData<RenameRequestData>();
  const renameCollectionDialog = useDialogWithData<RenameCollectionData>();
  const renameFolderDialog = useDialogWithData<RenameFolderData>();

  const { updateCollection, updateRequest, updateFolder } = useCollectionsStore();

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

  const handleNewRequest = () => {
    openRequestTab({
      savedRequestId: '',
      collectionId: '',
      request: { method: 'GET', url: '', auth: { type: 'none' } },
      label: 'New Request',
    });
  };

  const handleRenameRequest = (request: SavedRequest) => {
    renameRequestDialog.open({ request });
  };

  const handleRenameCollection = (collectionId: string, collectionName: string) => {
    renameCollectionDialog.open({ id: collectionId, name: collectionName });
  };

  const handleRenameFolder = (collectionId: string, folderId: string, folderName: string) => {
    renameFolderDialog.open({ collectionId, id: folderId, name: folderName });
  };

  const handleSaveRequestRename = async (newName: string) => {
    if (!renameRequestDialog.data) return;

    await updateRequest(renameRequestDialog.data.request.collectionId, renameRequestDialog.data.request.id, { name: newName });
    renameRequestDialog.close();
  };

  const handleSaveCollectionRename = async (newName: string) => {
    if (!renameCollectionDialog.data) return;

    await updateCollection(renameCollectionDialog.data.id, { name: newName });
    renameCollectionDialog.close();
  };

  const handleSaveFolderRename = async (newName: string) => {
    if (!renameFolderDialog.data) return;

    await updateFolder(renameFolderDialog.data.collectionId, renameFolderDialog.data.id, { name: newName });
    renameFolderDialog.close();
  };

  if (!isSidebarOpen) return null;

  return (
    <div
      ref={sidebarRef}
      className="bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col relative flex-1 min-h-0"
      style={{ width: `${sidebarWidth}px` }}
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Collections</h2>
          <div className="flex gap-2">
            <Button onClick={handleNewRequest} variant="icon" size="md" title="New Request">
              <Plus className="w-5 h-5" />
            </Button>
            <Button onClick={newCollectionDialog.open} variant="icon" size="md" title="New Collection">
              <FolderPlus className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">Loading collections...</div>
        ) : collections.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <FolderIcon className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-sm">No collections yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create one to organize your requests</p>
          </div>
        ) : (
          <div className="py-2">
            {collections.map(collection => (
              <CollectionItem 
                key={collection.id} 
                collection={collection} 
                onOpenNewRequest={(collectionId, folderId) => 
                  newRequestDialog.open({ collectionId, folderId })
                }
                onRenameRequest={handleRenameRequest}
                onRenameCollection={handleRenameCollection}
                onRenameFolder={handleRenameFolder}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog isOpen={newCollectionDialog.isOpen} onClose={newCollectionDialog.close} title="New Collection">
        <NewCollectionForm onSuccess={newCollectionDialog.close} onCancel={newCollectionDialog.close} />
      </Dialog>

      <Dialog isOpen={newRequestDialog.isOpen} onClose={newRequestDialog.close} title="New Request">
        {newRequestDialog.data && (
          <NewRequestForm
            preselectedCollectionId={newRequestDialog.data.collectionId}
            preselectedFolderId={newRequestDialog.data.folderId}
            onSuccess={newRequestDialog.close}
            onCancel={newRequestDialog.close}
          />
        )}
      </Dialog>

      {renameRequestDialog.data && (
        <Dialog isOpen={renameRequestDialog.isOpen} onClose={renameRequestDialog.close} title="Rename Request">
          <RenameForm
            isOpen={true}
            onClose={renameRequestDialog.close}
            onSave={handleSaveRequestRename}
            currentName={renameRequestDialog.data.request.name}
            title="Rename Request"
            label="Request Name"
          />
        </Dialog>
      )}

      {renameCollectionDialog.data && (
        <Dialog isOpen={renameCollectionDialog.isOpen} onClose={renameCollectionDialog.close} title="Rename Collection">
          <RenameForm
            isOpen={true}
            onClose={renameCollectionDialog.close}
            onSave={handleSaveCollectionRename}
            currentName={renameCollectionDialog.data.name}
            title="Rename Collection"
            label="Collection Name"
            placeholder="Enter collection name..."
          />
        </Dialog>
      )}

      {renameFolderDialog.data && (
        <Dialog isOpen={renameFolderDialog.isOpen} onClose={renameFolderDialog.close} title="Rename Folder">
          <RenameForm
            isOpen={true}
            onClose={renameFolderDialog.close}
            onSave={handleSaveFolderRename}
            currentName={renameFolderDialog.data.name}
            title="Rename Folder"
            label="Folder Name"
            placeholder="Enter folder name..."
          />
        </Dialog>
      )}

      <div
        className="absolute top-0 right-0 w-1 h-full bg-transparent hover:bg-orange-500 dark:hover:bg-orange-600 cursor-ew-resize transition-colors"
        onMouseDown={handleMouseDown}
        title="Drag to resize"
      />
    </div>
  );
};
