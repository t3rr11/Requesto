import { useState } from 'react';
import { useUIStore } from '../store/ui';

interface DragDropCallbacks {
  onDropRequest?: (collectionId: string, requestId: string, targetOrder?: number) => Promise<void>;
  onDropFolder?: (collectionId: string, folderId: string) => Promise<void>;
  onDropMultipleRequests?: (requests: Array<{ collectionId: string; requestId: string }>, targetOrder?: number) => Promise<void>;
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
      
      // Check if this is a multi-select drag
      if (data.isMultiSelect && callbacks.onDropMultipleRequests) {
        await callbacks.onDropMultipleRequests(data.requests, index);
      } else {
        await callbacks.onDropRequest(data.collectionId, data.requestId, index);
      }
    }
  };

  // Request drag start/end handlers
  const createRequestDragHandlers = (requestId: string, collectionId: string) => {
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = 'move';
        
        const { selectedRequestIds } = useUIStore.getState();
        const isSelected = selectedRequestIds.has(requestId);
        
        // Check if dragging multiple selected items
        if (isSelected && selectedRequestIds.size > 1) {
          // Multi-select drag
          const requests = Array.from(selectedRequestIds).map(id => ({
            requestId: id,
            collectionId, // Note: This assumes all selected items are in same collection for now
          }));
          
          e.dataTransfer.setData(
            'application/request',
            JSON.stringify({ isMultiSelect: true, requests })
          );
        } else {
          // Single drag
          e.dataTransfer.setData(
            'application/request',
            JSON.stringify({ requestId, collectionId })
          );
        }
        
        (e.target as HTMLElement).style.opacity = '0.5';
      },
      onDragEnd: (e: React.DragEvent) => {
        (e.target as HTMLElement).style.opacity = '1';
        setDragOverIndex(null);
      },
    };
  };

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
