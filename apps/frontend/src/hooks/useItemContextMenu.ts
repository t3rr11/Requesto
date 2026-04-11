import { useState } from 'react';
import type { SavedRequest } from '../store/collections/types';

export function useItemContextMenu() {
  const [requestContextMenu, setRequestContextMenu] = useState<{
    x: number;
    y: number;
    request: SavedRequest;
  } | null>(null);

  const [collectionContextMenu, setCollectionContextMenu] = useState<{
    x: number;
    y: number;
    collectionId: string;
    collectionName: string;
  } | null>(null);

  const [folderContextMenu, setFolderContextMenu] = useState<{
    x: number;
    y: number;
    collectionId: string;
    folderId: string;
    folderName: string;
  } | null>(null);

  const openRequestContextMenu = (e: React.MouseEvent, request: SavedRequest) => {
    e.preventDefault();
    e.stopPropagation();
    setRequestContextMenu({ x: e.clientX, y: e.clientY, request });
  };

  const closeRequestContextMenu = () => setRequestContextMenu(null);

  const openCollectionContextMenu = (
    e: React.MouseEvent,
    collectionId: string,
    collectionName: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setCollectionContextMenu({ x: e.clientX, y: e.clientY, collectionId, collectionName });
  };

  const closeCollectionContextMenu = () => setCollectionContextMenu(null);

  const openFolderContextMenu = (
    e: React.MouseEvent,
    collectionId: string,
    folderId: string,
    folderName: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setFolderContextMenu({ x: e.clientX, y: e.clientY, collectionId, folderId, folderName });
  };

  const closeFolderContextMenu = () => setFolderContextMenu(null);

  return {
    requestContextMenu,
    openRequestContextMenu,
    closeRequestContextMenu,
    collectionContextMenu,
    openCollectionContextMenu,
    closeCollectionContextMenu,
    folderContextMenu,
    openFolderContextMenu,
    closeFolderContextMenu,
  };
}
