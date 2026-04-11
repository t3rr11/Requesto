import { useState } from 'react';
import { useUIStore } from '../store/ui/store';

type DragDropCallbacks = {
  onDropRequest?: (collectionId: string, requestId: string, targetOrder?: number) => Promise<void>;
  onDropFolder?: (collectionId: string, folderId: string) => Promise<void>;
  onDropMultipleRequests?: (
    requests: Array<{ collectionId: string; requestId: string }>,
    targetOrder?: number,
  ) => Promise<void>;
};

export function useItemDragDrop(callbacks: DragDropCallbacks = {}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
      if (data.isMultiSelect && callbacks.onDropMultipleRequests) {
        await callbacks.onDropMultipleRequests(data.requests);
      } else if (callbacks.onDropRequest) {
        await callbacks.onDropRequest(data.collectionId, data.requestId);
      }
    } else if (dragType === 'application/folder' && callbacks.onDropFolder) {
      const data = JSON.parse(e.dataTransfer.getData('application/folder'));
      await callbacks.onDropFolder(data.collectionId, data.folderId);
    }
  };

  const handleDragOverIndex = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(index);
  };

  const handleDragLeaveIndex = () => setDragOverIndex(null);

  const handleDropAtIndex = async (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);

    const dragType = e.dataTransfer.types.find(t => t.startsWith('application/'));
    if (dragType === 'application/request' && callbacks.onDropRequest) {
      const data = JSON.parse(e.dataTransfer.getData('application/request'));
      if (data.isMultiSelect && callbacks.onDropMultipleRequests) {
        await callbacks.onDropMultipleRequests(data.requests, index);
      } else {
        await callbacks.onDropRequest(data.collectionId, data.requestId, index);
      }
    }
  };

  const createRequestDragHandlers = (requestId: string, collectionId: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.stopPropagation();
      e.dataTransfer.effectAllowed = 'move';

      const { selectedRequestIds } = useUIStore.getState();
      const isSelected = selectedRequestIds.has(requestId);

      if (isSelected && selectedRequestIds.size > 1) {
        const requests = Array.from(selectedRequestIds).map(id => ({
          requestId: id,
          collectionId,
        }));
        e.dataTransfer.setData('application/request', JSON.stringify({ isMultiSelect: true, requests }));
      } else {
        e.dataTransfer.setData('application/request', JSON.stringify({ requestId, collectionId }));
      }

      (e.target as HTMLElement).style.opacity = '0.5';
    },
    onDragEnd: (e: React.DragEvent) => {
      (e.target as HTMLElement).style.opacity = '1';
      setDragOverIndex(null);
    },
  });

  const createFolderDragHandlers = (folderId: string, collectionId: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.stopPropagation();
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/folder', JSON.stringify({ folderId, collectionId }));
      (e.target as HTMLElement).style.opacity = '0.5';
    },
    onDragEnd: (e: React.DragEvent) => {
      (e.target as HTMLElement).style.opacity = '1';
      setDragOverIndex(null);
    },
  });

  return {
    isDragOver,
    dragOverIndex,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragOverIndex,
    handleDragLeaveIndex,
    handleDropAtIndex,
    createRequestDragHandlers,
    createFolderDragHandlers,
  };
}
