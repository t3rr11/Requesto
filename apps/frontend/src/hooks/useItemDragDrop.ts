import { useState } from 'react';

type DragDropCallbacks = {
  onDropFolder?: (collectionId: string, folderId: string) => Promise<void>;
  onDropRequest?: (collectionId: string, requestId: string) => Promise<void>;
};

export function useItemDragDrop(callbacks: DragDropCallbacks = {}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('application/folder') || e.dataTransfer.types.includes('application/request')) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOverIndex = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(index);
  };

  const handleDragLeaveIndex = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragOverIndex(null);

    if (e.dataTransfer.types.includes('application/request') && callbacks.onDropRequest) {
      const data = JSON.parse(e.dataTransfer.getData('application/request'));
      await callbacks.onDropRequest(data.collectionId, data.requestId);
    } else if (e.dataTransfer.types.includes('application/folder') && callbacks.onDropFolder) {
      const data = JSON.parse(e.dataTransfer.getData('application/folder'));
      await callbacks.onDropFolder(data.collectionId, data.folderId);
    }
  };

  const createRequestDragHandlers = (requestId: string, collectionId: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.stopPropagation();
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/request', JSON.stringify({ requestId, collectionId }));
      (e.target as HTMLElement).style.opacity = '0.5';
    },
    onDragEnd: (e: React.DragEvent) => {
      (e.target as HTMLElement).style.opacity = '1';
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
    },
  });

  return {
    isDragOver,
    dragOverIndex,
    handleDragOver,
    handleDragLeave,
    handleDragOverIndex,
    handleDragLeaveIndex,
    handleDrop,
    createRequestDragHandlers,
    createFolderDragHandlers,
  };
}
