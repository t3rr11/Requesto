import { useState } from 'react';

interface DragDropCallbacks {
  onDropRequest?: (collectionId: string, requestId: string, targetOrder?: number) => Promise<void>;
  onDropFolder?: (collectionId: string, folderId: string) => Promise<void>;
}

/**
 * Hook for managing drag-and-drop state and handlers
 * Supports dragging requests and folders with visual feedback
 */
export const useItemDragDrop = (callbacks: DragDropCallbacks = {}) => {
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

    const dragType = e.dataTransfer.types.find((t) => t.startsWith('application/'));

    if (dragType === 'application/request' && callbacks.onDropRequest) {
      const data = JSON.parse(e.dataTransfer.getData('application/request'));
      await callbacks.onDropRequest(data.collectionId, data.requestId);
    } else if (dragType === 'application/folder' && callbacks.onDropFolder) {
      const data = JSON.parse(e.dataTransfer.getData('application/folder'));
      await callbacks.onDropFolder(data.collectionId, data.folderId);
    }
  };

  // Handlers for drag-drop reordering with visual indicator
  const handleDragOverIndex = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(index);
  };

  const handleDragLeaveIndex = () => {
    setDragOverIndex(null);
  };

  const handleDropAtIndex = async (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);

    const dragType = e.dataTransfer.types.find((t) => t.startsWith('application/'));
    if (dragType === 'application/request' && callbacks.onDropRequest) {
      const data = JSON.parse(e.dataTransfer.getData('application/request'));
      await callbacks.onDropRequest(data.collectionId, data.requestId, index);
    }
  };

  // Request drag start/end handlers
  const createRequestDragHandlers = (requestId: string, collectionId: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.stopPropagation();
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData(
        'application/request',
        JSON.stringify({ requestId, collectionId })
      );
      (e.target as HTMLElement).style.opacity = '0.5';
    },
    onDragEnd: (e: React.DragEvent) => {
      (e.target as HTMLElement).style.opacity = '1';
      setDragOverIndex(null);
    },
  });

  // Folder drag start/end handlers
  const createFolderDragHandlers = (folderId: string, collectionId: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.stopPropagation();
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData(
        'application/folder',
        JSON.stringify({ folderId, collectionId })
      );
      (e.target as HTMLElement).style.opacity = '0.5';
    },
    onDragEnd: (e: React.DragEvent) => {
      (e.target as HTMLElement).style.opacity = '1';
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
};
