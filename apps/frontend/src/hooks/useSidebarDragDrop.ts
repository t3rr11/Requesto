import { useCallback, useState } from 'react';
import type { DragStartEvent, DragEndEvent, CollisionDetection } from '@dnd-kit/core';
import { useSensor, useSensors, PointerSensor, KeyboardSensor, closestCenter } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useCollectionsStore } from '../store/collections/store';
import { useUIStore } from '../store/ui/store';
import type { SavedRequest } from '../store/collections/types';

export function useSidebarDragDrop() {
  const { collections, moveCollection, moveRequest, moveRequests } = useCollectionsStore();
  const { clearSelection, selectedRequestIds } = useUIStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const collisionDetection: CollisionDetection = useCallback(args => {
    if (args.active.data.current?.type === 'collection') {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter(c => c.data.current?.type === 'collection'),
      });
    }
    return closestCenter(args);
  }, []);

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (!over || active.id === over.id) return;

    const activeData = active.data.current as { type: string; collectionId?: string; folderId?: string } | undefined;
    if (!activeData) return;

    if (activeData.type === 'collection') {
      const overData = over.data.current as { type: string; collectionId?: string } | undefined;
      if (!overData) return;

      const targetCollectionId =
        overData.type === 'collection'
          ? (over.id as string)
          : overData.type === 'collection-root' && overData.collectionId
            ? overData.collectionId
            : null;
      if (!targetCollectionId) return;
      const targetIndex = collections.findIndex(c => c.id === targetCollectionId);
      if (targetIndex === -1) return;
      moveCollection(active.id as string, targetIndex);
      return;
    }

    if (activeData.type !== 'request') return;

    const overData = over.data.current as { type: string; collectionId: string; folderId?: string } | undefined;
    if (!overData) return;

    let targetCollectionId: string;
    let targetFolderId: string | undefined;
    let targetOrder: number | undefined;

    if (overData.type === 'request') {
      targetCollectionId = overData.collectionId;
      targetFolderId = overData.folderId;
      const targetCollection = collections.find(c => c.id === targetCollectionId);
      if (!targetCollection) return;
      const slotRequests = targetCollection.requests
        .filter(r => r.folderId === targetFolderId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      targetOrder = slotRequests.findIndex(r => r.id === over.id);
      if (targetOrder === -1) return;
    } else if (overData.type === 'folder' || overData.type === 'collection-root') {
      targetCollectionId = overData.collectionId;
      targetFolderId = overData.folderId;
      // targetOrder undefined → appends to end of target container
    } else {
      return;
    }

    // If dragging one of multiple selected items, move all of them to the same target
    if (selectedRequestIds.size > 1 && selectedRequestIds.has(active.id as string)) {
      const allRequests = collections.flatMap(c => c.requests);
      const toMove = [...selectedRequestIds]
        .map(id => allRequests.find(r => r.id === id))
        .filter((r): r is SavedRequest => r !== undefined)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(r => ({ sourceCollectionId: r.collectionId, requestId: r.id }));
      moveRequests(toMove, targetCollectionId, targetFolderId, targetOrder);
      clearSelection();
      return;
    }

    moveRequest(activeData.collectionId!, active.id as string, targetCollectionId, targetFolderId, targetOrder);
    clearSelection();
  };

  const handleDragCancel = () => {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const activeCollection = activeId ? collections.find(c => c.id === activeId) : null;
  const activeRequest =
    activeId && !activeCollection ? collections.flatMap(c => c.requests).find(r => r.id === activeId) : null;

  return { sensors, collisionDetection, handleDragStart, handleDragEnd, handleDragCancel, activeCollection, activeRequest };
}
