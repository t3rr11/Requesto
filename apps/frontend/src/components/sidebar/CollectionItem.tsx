import React, { useMemo } from 'react';
import type { Collection, SavedRequest } from '../../store/collections/types';
import { useDroppable, useDndContext } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useCollectionsStore } from '../../store/collections/store';
import { useUIStore } from '../../store/ui/store';
import { FolderItem } from './FolderItem';
import { RequestItem } from './RequestItem';
import { Button } from '../Button';
import { ContextMenu } from '../ContextMenu';
import { ConfirmDialog } from '../ConfirmDialog';
import { SyncPreviewDialog } from '../SyncPreviewDialog';
import { CollectionRunnerDialog } from '../CollectionRunnerDialog';
import { CollectionVariablesDialog } from '../../forms/CollectionVariablesDialog';
import { useCollectionContextMenus } from '../../hooks/useCollectionContextMenus';
import { useItemActions } from '../../hooks/useItemActions';
import { useItemDragDrop } from '../../hooks/useItemDragDrop';
import {
  ChevronRight,
  ChevronDown,
  FolderPlus,
  Link2,
  Package,
  Trash2,
} from 'lucide-react';

interface CollectionItemProps {
  collection: Collection;
  searchQuery?: string;
  onRenameRequest: (request: SavedRequest) => void;
  onRenameCollection: (collectionId: string, collectionName: string) => void;
  onRenameFolder: (collectionId: string, folderId: string, folderName: string) => void;
  onCreateFolder: (collectionId: string, parentId?: string) => void;
  onOpenDocs: (collectionId: string) => void;
}

export function CollectionItem({
  collection,
  searchQuery,
  onRenameRequest,
  onRenameCollection,
  onRenameFolder,
  onCreateFolder,
  onOpenDocs,
}: CollectionItemProps) {
  const { expandedCollections, toggleCollection, selectedRequestIds, toggleRequestSelection, clearSelection } =
    useUIStore();

  const {
    activeSavedRequestId,
    handleSelectRequest,
    handleDeleteCollection,
    handleDeleteRequest,
    confirmDialog,
  } = useItemActions();

  const {
    requestContextMenu,
    openRequestContextMenu,
    closeRequestContextMenu,
    requestMenuItems,
    collectionContextMenu,
    openCollectionContextMenu,
    closeCollectionContextMenu,
    collectionMenuItems,
    runnerOpen,
    closeRunner,
    variablesOpen,
    closeVariablesDialog,
    syncDialogOpen,
    syncLoading,
    syncPreviewData,
    closeSyncDialog,
    handleSyncApply,
  } = useCollectionContextMenus({
    collection,
    confirmDialog,
    onRenameRequest,
    onRenameCollection,
    onCreateFolder,
    onOpenDocs,
  });

  const {
    isDragOver,
    handleDragOver,
    handleDragLeave,
  } = useItemDragDrop({
    onDropFolder: async (collectionId, folderId) => {
      if (folderId !== collection.id) {
        const { moveFolder } = useCollectionsStore.getState();
        await moveFolder(collectionId, folderId, collection.id, undefined);
      }
    },
  });

  const { setNodeRef: setCollectionDropRef, isOver: isRequestDragOver } = useDroppable({
    id: `${collection.id}-root`,
    data: { type: 'collection-root', collectionId: collection.id, folderId: undefined },
  });

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: collection.id,
    data: { type: 'collection', collectionId: collection.id },
    disabled: !!searchQuery?.trim() || !!collection.isSystem,
  });

  const { active } = useDndContext();
  const isDraggingCollection = active?.data.current?.type === 'collection';

  const isExpanded = expandedCollections.has(collection.id);
  const isSearching = !!searchQuery?.trim();
  const query = searchQuery?.toLowerCase() ?? '';

  const { filteredRootFolders, filteredRootRequests } = useMemo(() => {
    const rootFolders = (collection.folders || []).filter(f => !f.parentId);
    const rootRequests = collection.requests.filter(r => !r.folderId).sort((a, b) => (a.order || 0) - (b.order || 0));
    if (!query) return { filteredRootFolders: rootFolders, filteredRootRequests: rootRequests };
    const matchedFolderIds = new Set<string>();
    for (const folder of collection.folders || []) {
      if (folder.name.toLowerCase().includes(query)) matchedFolderIds.add(folder.id);
      const folderReqs = collection.requests.filter(r => r.folderId === folder.id);
      if (folderReqs.some(r => r.name.toLowerCase().includes(query) || r.url.toLowerCase().includes(query))) matchedFolderIds.add(folder.id);
    }
    for (const folder of collection.folders || []) {
      if (matchedFolderIds.has(folder.id) && folder.parentId) {
        let parentId: string | undefined = folder.parentId;
        while (parentId) {
          matchedFolderIds.add(parentId);
          const parent = collection.folders?.find(f => f.id === parentId);
          parentId = parent?.parentId;
        }
      }
    }
    return {
      filteredRootFolders: rootFolders.filter(f => matchedFolderIds.has(f.id)),
      filteredRootRequests: rootRequests.filter(r => r.name.toLowerCase().includes(query) || r.url.toLowerCase().includes(query)),
    };
  }, [collection, query]);

  const showExpanded = isSearching || isExpanded;

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('application/folder')) {
      const data = JSON.parse(e.dataTransfer.getData('application/folder'));
      if (data.folderId !== collection.id) {
        const { moveFolder } = useCollectionsStore.getState();
        await moveFolder(data.collectionId, data.folderId, collection.id, undefined);
      }
    }
  };

  const rootFolders = filteredRootFolders;
  const rootRequests = filteredRootRequests;
  const totalItems = collection.requests.length;
  const allRequestIds = rootRequests.map(r => r.id);

  return (
    <div
      ref={setSortableRef}
      className="mb-0.5"
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      <div
        ref={setCollectionDropRef}
        className={`px-3 py-2 cursor-pointer flex items-center justify-between group transition-colors ${
          !isDraggingCollection && (isDragOver || isRequestDragOver)
            ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
        }`}
        onClick={() => toggleCollection(collection.id)}
        onContextMenu={e => openCollectionContextMenu(e, collection.id, collection.name)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
          )}
          <Package className="w-4 h-4 text-orange-500 dark:text-orange-400 shrink-0" />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{collection.name}</span>
          {!!collection.openApiSpec && (
            <span title={`Linked to ${collection.openApiSpec.source}`}>
              <Link2 className="w-3 h-3 text-blue-500 shrink-0" />
            </span>
          )}
          <span className="ml-1 text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded px-1.5 py-0.5 font-medium shrink-0">
            {totalItems}
          </span>
        </div>
        {!collection.isSystem && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
            <Button
              onClick={e => { e.stopPropagation(); onCreateFolder(collection.id); }}
              variant="icon"
              size="sm"
              title="New Folder"
              className="hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </Button>
            <Button
              onClick={e => handleDeleteCollection(collection.id, e)}
              variant="icon"
              size="sm"
              title="Delete Collection"
              className="hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {showExpanded && (
        <div className="ml-4 border-l border-gray-200 dark:border-gray-700">
          {rootFolders.map(folder => (
            <FolderItem
              key={folder.id}
              folder={folder}
              collection={collection}
              searchQuery={searchQuery}
              onRenameRequest={onRenameRequest}
              onRenameFolder={onRenameFolder}
              onCreateFolder={onCreateFolder}
            />
          ))}

          {rootRequests.length === 0 && rootFolders.length === 0 ? (
            <div className="pl-3 pr-4 py-2 text-xs text-gray-400 italic">No requests yet</div>
          ) : (
            <SortableContext items={rootRequests.map(r => r.id)} strategy={verticalListSortingStrategy}>
              {rootRequests.map(request => (
                <RequestItem
                  key={request.id}
                  request={request}
                  collectionId={collection.id}
                  isActive={activeSavedRequestId === request.id}
                  isSelected={selectedRequestIds.has(request.id)}
                  onSelect={e => {
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
                  onDelete={e => handleDeleteRequest(collection.id, request.id, e)}
                />
              ))}
            </SortableContext>
          )}
        </div>
      )}

      {requestContextMenu && (
        <ContextMenu
          position={{ x: requestContextMenu.x, y: requestContextMenu.y }}
          items={requestMenuItems}
          onClose={closeRequestContextMenu}
        />
      )}

      {collectionContextMenu && (
        <ContextMenu
          position={{ x: collectionContextMenu.x, y: collectionContextMenu.y }}
          items={collectionMenuItems}
          onClose={closeCollectionContextMenu}
        />
      )}

      <SyncPreviewDialog
        isOpen={syncDialogOpen}
        onClose={closeSyncDialog}
        preview={syncPreviewData}
        loading={syncLoading}
        onApply={handleSyncApply}
      />

      <ConfirmDialog {...confirmDialog.props} />

      <CollectionRunnerDialog
        isOpen={runnerOpen}
        onClose={closeRunner}
        collections={[collection]}
      />

      <CollectionVariablesDialog
        isOpen={variablesOpen}
        onClose={closeVariablesDialog}
        collection={collection}
      />
    </div>
  );
}
