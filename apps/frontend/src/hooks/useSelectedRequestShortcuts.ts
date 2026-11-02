import { useEffect, useRef } from 'react';
import { useCollectionsStore } from '../store/collections/store';
import { useUIStore } from '../store/ui/store';
import { useAlertStore } from '../store/alert/store';
import { useConfirmDialog } from './useDialog';
import type { SavedRequest } from '../store/collections/types';

/**
 * Copy / paste / delete keyboard shortcuts (Ctrl+C, Ctrl+V, Delete) operating
 * on the multi-selected requests in the sidebar.
 */
export function useSelectedRequestShortcuts() {
  const { clearSelection } = useUIStore();
  const { deleteRequests, duplicateRequests } = useCollectionsStore();
  const { showAlert } = useAlertStore();
  const confirmDialog = useConfirmDialog();
  const clipboardRef = useRef<SavedRequest[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      // Don't fire when a modal dialog is open
      if (document.querySelector('[role="dialog"]')) return;

      const ids = useUIStore.getState().selectedRequestIds as Set<string>;
      if (ids.size === 0) return;

      const isMod = e.ctrlKey || e.metaKey;

      if (isMod && e.key === 'c') {
        e.preventDefault();
        const allRequests = useCollectionsStore.getState().collections.flatMap(c => c.requests);
        clipboardRef.current = [...ids]
          .map(id => allRequests.find(r => r.id === id))
          .filter((r): r is SavedRequest => r !== undefined);
        showAlert(
          `${clipboardRef.current.length} request${clipboardRef.current.length !== 1 ? 's' : ''} copied`,
          'success'
        );
        return;
      }

      if (isMod && e.key === 'v') {
        if (clipboardRef.current.length === 0) return;
        e.preventDefault();
        const reqs = clipboardRef.current.map(r => ({ collectionId: r.collectionId, requestId: r.id }));
        duplicateRequests(reqs)
          .then(() => showAlert(`${reqs.length} request${reqs.length !== 1 ? 's' : ''} pasted`, 'success'))
          .catch(() => showAlert('Failed to paste requests', 'error'));
        return;
      }

      if (e.key === 'Delete') {
        e.preventDefault();
        const allRequests = useCollectionsStore.getState().collections.flatMap(c => c.requests);
        const toDelete = [...ids]
          .map(id => allRequests.find(r => r.id === id))
          .filter((r): r is SavedRequest => r !== undefined);
        if (toDelete.length === 0) return;
        confirmDialog.open({
          title: `Delete ${toDelete.length} Request${toDelete.length !== 1 ? 's' : ''}`,
          message:
            toDelete.length === 1
              ? 'Are you sure you want to delete this request? This action cannot be undone.'
              : `Are you sure you want to delete these ${toDelete.length} requests? This action cannot be undone.`,
          confirmText: 'Delete',
          variant: 'danger',
          onConfirm: async () => {
            await deleteRequests(toDelete.map(r => ({ collectionId: r.collectionId, requestId: r.id })));
            clearSelection();
          },
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [clearSelection, confirmDialog, deleteRequests, duplicateRequests, showAlert]);

  return { confirmDialog };
}
