import { useMemo, useState } from 'react';
import {
  BookOpen,
  Copy,
  Download,
  FileText,
  FolderPlus,
  Play,
  RefreshCw,
  Trash2,
  Unlink,
} from 'lucide-react';
import type { Collection, SavedRequest, SyncPreviewResult } from '../store/collections/types';
import { useCollectionsStore } from '../store/collections/store';
import { useUIStore } from '../store/ui/store';
import { useAlertStore } from '../store/alert/store';
import { useItemContextMenu } from './useItemContextMenu';
import type { ConfirmDialogConfig } from './useDialog';
import type { ContextMenuItem } from '../components/ContextMenu';

interface UseCollectionContextMenusOptions {
  collection: Collection;
  confirmDialog: { open: (config: ConfirmDialogConfig) => void };
  onRenameRequest: (request: SavedRequest) => void;
  onRenameCollection: (collectionId: string, collectionName: string) => void;
  onCreateFolder: (collectionId: string) => void;
  onOpenDocs: (collectionId: string) => void;
}

/**
 * Context menu wiring for a collection row: request and collection menus, the
 * multi-select aware delete/duplicate actions, and the sync-from-spec dialog
 * state that the OpenAPI context entries drive.
 */
export function useCollectionContextMenus(options: UseCollectionContextMenusOptions) {
  const { collection, confirmDialog, onRenameRequest, onRenameCollection, onCreateFolder, onOpenDocs } = options;
  const { exportCollection, exportRequest, syncPreview, syncApply, unlinkSpec } = useCollectionsStore();
  const { showAlert } = useAlertStore();
  const { selectedRequestIds } = useUIStore();

  const {
    requestContextMenu,
    openRequestContextMenu,
    closeRequestContextMenu,
    collectionContextMenu,
    openCollectionContextMenu,
    closeCollectionContextMenu,
  } = useItemContextMenu();

  const [runnerOpen, setRunnerOpen] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncPreviewData, setSyncPreviewData] = useState<SyncPreviewResult | null>(null);

  const handleRenameRequestFromContext = () => {
    if (!requestContextMenu) return;
    onRenameRequest(requestContextMenu.request);
    closeRequestContextMenu();
  };

  const handleDeleteRequestFromContext = () => {
    if (!requestContextMenu) return;
    const isMulti = selectedRequestIds.size > 1 && selectedRequestIds.has(requestContextMenu.request.id);
    const { deleteRequest, deleteRequests } = useCollectionsStore.getState();
    const allRequests = useCollectionsStore.getState().collections.flatMap(c => c.requests);
    const targets = isMulti
      ? [...selectedRequestIds].map(id => allRequests.find(r => r.id === id)).filter((r): r is SavedRequest => r !== undefined)
      : [requestContextMenu.request];
    confirmDialog.open({
      title: `Delete ${targets.length > 1 ? `${targets.length} Requests` : 'Request'}`,
      message:
        targets.length > 1
          ? `Are you sure you want to delete these ${targets.length} requests? This action cannot be undone.`
          : 'Are you sure you want to delete this request? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        if (targets.length > 1) {
          await deleteRequests(targets.map(r => ({ collectionId: r.collectionId, requestId: r.id })));
        } else {
          await deleteRequest(targets[0].collectionId, targets[0].id);
        }
      },
    });
    closeRequestContextMenu();
  };

  const handleDuplicateRequest = async () => {
    if (!requestContextMenu) return;
    const { duplicateRequest, duplicateRequests } = useCollectionsStore.getState();
    const isMulti = selectedRequestIds.size > 1 && selectedRequestIds.has(requestContextMenu.request.id);
    closeRequestContextMenu();
    try {
      if (isMulti) {
        const allRequests = useCollectionsStore.getState().collections.flatMap(c => c.requests);
        const targets = [...selectedRequestIds]
          .map(id => allRequests.find(r => r.id === id))
          .filter((r): r is SavedRequest => r !== undefined);
        await duplicateRequests(targets.map(r => ({ collectionId: r.collectionId, requestId: r.id })));
        showAlert(`${targets.length} requests duplicated successfully`, 'success');
      } else {
        await duplicateRequest(requestContextMenu.request.collectionId, requestContextMenu.request.id);
        showAlert('Request duplicated successfully', 'success');
      }
    } catch {
      showAlert('Failed to duplicate request', 'error');
    }
  };

  const handleExportRequest = async () => {
    try {
      await exportRequest(requestContextMenu!.request.collectionId, requestContextMenu!.request.id);
      showAlert('Request exported successfully', 'success');
    } catch {
      showAlert('Failed to export request', 'error');
    }
    closeRequestContextMenu();
  };

  const handleNewFolderFromContext = () => {
    if (!collectionContextMenu) return;
    onCreateFolder(collectionContextMenu.collectionId);
    closeCollectionContextMenu();
  };

  const handleRenameCollectionFromContext = () => {
    if (!collectionContextMenu) return;
    onRenameCollection(collectionContextMenu.collectionId, collectionContextMenu.collectionName);
    closeCollectionContextMenu();
  };

  const handleDeleteCollectionFromContext = () => {
    if (!collectionContextMenu) return;
    const { deleteCollection } = useCollectionsStore.getState();
    confirmDialog.open({
      title: 'Delete Collection',
      message: 'Are you sure you want to delete this collection and all its requests? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        await deleteCollection(collectionContextMenu.collectionId);
      },
    });
    closeCollectionContextMenu();
  };

  const handleExportCollection = async () => {
    try {
      await exportCollection(collectionContextMenu!.collectionId);
      showAlert('Collection exported successfully', 'success');
    } catch {
      showAlert('Failed to export collection', 'error');
    }
    closeCollectionContextMenu();
  };

  const handleDuplicateCollection = async () => {
    if (!collectionContextMenu) return;
    const { duplicateCollection } = useCollectionsStore.getState();
    closeCollectionContextMenu();
    try {
      await duplicateCollection(collectionContextMenu.collectionId);
      showAlert('Collection duplicated successfully', 'success');
    } catch {
      showAlert('Failed to duplicate collection', 'error');
    }
  };

  const handleUnlinkSpec = async () => {
    closeCollectionContextMenu();
    try {
      await unlinkSpec(collection.id);
      showAlert('Spec unlinked', 'success');
    } catch {
      showAlert('Failed to unlink spec', 'error');
    }
  };

  const handleSyncFromSpec = async () => {
    closeCollectionContextMenu();
    setSyncDialogOpen(true);
    setSyncLoading(true);
    setSyncPreviewData(null);
    try {
      const result = await syncPreview(collection.id);
      if ('noChanges' in result && result.noChanges) {
        showAlert('Spec is up to date — no changes detected', 'success');
        setSyncDialogOpen(false);
        return;
      }
      setSyncPreviewData(result as SyncPreviewResult);
    } catch (err) {
      showAlert(err instanceof Error ? err.message : 'Failed to check for spec changes', 'error');
      setSyncDialogOpen(false);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSyncApply = async (body: Parameters<typeof syncApply>[1]) => {
    try {
      await syncApply(collection.id, body);
      showAlert('Sync applied successfully', 'success');
    } catch (err) {
      showAlert(err instanceof Error ? err.message : 'Failed to apply sync', 'error');
    }
  };

  const handleRunCollectionFromContext = () => {
    closeCollectionContextMenu();
    setRunnerOpen(true);
  };

  const handleViewDocsFromContext = () => {
    closeCollectionContextMenu();
    onOpenDocs(collectionContextMenu!.collectionId);
  };

  const isMultiSelected = requestContextMenu !== null && selectedRequestIds.size > 1 && selectedRequestIds.has(requestContextMenu.request.id);

  const requestMenuItems = useMemo<ContextMenuItem[]>(
    () =>
      requestContextMenu
        ? [
            { label: 'Rename', icon: <FileText className="w-4 h-4" />, onClick: handleRenameRequestFromContext },
            {
              label: isMultiSelected ? `Duplicate (${selectedRequestIds.size})` : 'Duplicate',
              icon: <Copy className="w-4 h-4" />,
              onClick: () => void handleDuplicateRequest(),
            },
            { label: 'Export', icon: <Download className="w-4 h-4" />, onClick: () => void handleExportRequest() },
            {
              label: isMultiSelected ? `Delete (${selectedRequestIds.size})` : 'Delete',
              icon: <Trash2 className="w-4 h-4" />,
              onClick: handleDeleteRequestFromContext,
              danger: true,
            },
          ]
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requestContextMenu, isMultiSelected, selectedRequestIds.size],
  );

  const collectionMenuItems = useMemo<ContextMenuItem[]>(
    () =>
      collectionContextMenu
        ? [
            { label: 'Run Collection', icon: <Play className="w-4 h-4" />, onClick: handleRunCollectionFromContext },
            { label: 'View Documentation', icon: <BookOpen className="w-4 h-4" />, onClick: handleViewDocsFromContext },
            ...(collection.isSystem ? [] : [
              { label: 'New Folder', icon: <FolderPlus className="w-4 h-4" />, onClick: handleNewFolderFromContext },
              { label: 'Rename', icon: <FileText className="w-4 h-4" />, onClick: handleRenameCollectionFromContext },
              { label: 'Duplicate', icon: <Copy className="w-4 h-4" />, onClick: () => void handleDuplicateCollection() },
            ]),
            { label: 'Export', icon: <Download className="w-4 h-4" />, onClick: () => void handleExportCollection() },
            ...(!!collection.openApiSpec ? [
              { label: 'Sync from Spec', icon: <RefreshCw className="w-4 h-4" />, onClick: () => void handleSyncFromSpec() },
              { label: 'Unlink Spec', icon: <Unlink className="w-4 h-4" />, onClick: () => void handleUnlinkSpec() },
            ] : []),
            ...(collection.isSystem ? [] : [
              { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: handleDeleteCollectionFromContext, danger: true },
            ]),
          ]
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collectionContextMenu, collection.isSystem, collection.openApiSpec],
  );

  return {
    requestContextMenu,
    openRequestContextMenu,
    closeRequestContextMenu,
    requestMenuItems,
    collectionContextMenu,
    openCollectionContextMenu,
    closeCollectionContextMenu,
    collectionMenuItems,
    runnerOpen,
    closeRunner: () => setRunnerOpen(false),
    syncDialogOpen,
    syncLoading,
    syncPreviewData,
    closeSyncDialog: () => setSyncDialogOpen(false),
    handleSyncApply,
  };
}
