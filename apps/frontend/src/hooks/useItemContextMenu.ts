import { useState } from 'react';
import { SavedRequest } from '../types';

/**
 * Hook for managing context menus on collections, folders, and requests
 */
export const useItemContextMenu = () => {
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

  // Request context menu handlers
  const openRequestContextMenu = (e: React.MouseEvent, request: SavedRequest) => {
    e.preventDefault();
    e.stopPropagation();
    setRequestContextMenu({ x: e.clientX, y: e.clientY, request });
  };

  const closeRequestContextMenu = () => {
    setRequestContextMenu(null);
  };

  // Collection context menu handlers
  const openCollectionContextMenu = (
    e: React.MouseEvent,
    collectionId: string,
    collectionName: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setCollectionContextMenu({ x: e.clientX, y: e.clientY, collectionId, collectionName });
  };

  const closeCollectionContextMenu = () => {
    setCollectionContextMenu(null);
  };

  // Folder context menu handlers
  const openFolderContextMenu = (
    e: React.MouseEvent,
    collectionId: string,
    folderId: string,
    folderName: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setFolderContextMenu({ x: e.clientX, y: e.clientY, collectionId, folderId, folderName });
  };

  const closeFolderContextMenu = () => {
    setFolderContextMenu(null);
  };

  return {
    // Request context menu
    requestContextMenu,
    openRequestContextMenu,
    closeRequestContextMenu,
    
    // Collection context menu
    collectionContextMenu,
    openCollectionContextMenu,
    closeCollectionContextMenu,
    
    // Folder context menu
    folderContextMenu,
    openFolderContextMenu,
    closeFolderContextMenu,
  };
};
