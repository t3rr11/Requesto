import { useState, useEffect } from 'react';
import { useAppStore } from '../store/store';
import { collectionsApi } from '../helpers/api/collections';
import { SavedRequest } from '../store/types';

export const useCollectionsSidebar = () => {
  const { collections, setCollections, activeRequestId, setActiveRequest } = useAppStore();
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [newFolderInput, setNewFolderInput] = useState<{ collectionId: string; parentId?: string } | null>(null);
  const [folderName, setFolderName] = useState('');
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
  const [renameRequest, setRenameRequest] = useState<SavedRequest | null>(null);
  const [renameCollection, setRenameCollection] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    setLoading(true);
    try {
      const data = await collectionsApi.getAll();
      setCollections(data);
    } catch (error) {
      console.error('Failed to load collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCollection = (id: string) => {
    const newExpanded = new Set(expandedCollections);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCollections(newExpanded);
  };

  const toggleFolder = (id: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFolders(newExpanded);
  };

  const handleSelectRequest = (request: SavedRequest, onSelectRequest: (request: SavedRequest) => void) => {
    setActiveRequest(request.id);
    onSelectRequest(request);
  };

  const handleDeleteCollection = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Collection',
      message: 'Are you sure you want to delete this collection and all its requests? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await collectionsApi.delete(id);
          await loadCollections();
        } catch (error) {
          console.error('Failed to delete collection:', error);
        }
      },
    });
  };

  const handleDeleteFolder = async (collectionId: string, folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Folder',
      message: 'Are you sure you want to delete this folder and all its contents? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await collectionsApi.deleteFolder(collectionId, folderId);
          await loadCollections();
        } catch (error) {
          console.error('Failed to delete folder:', error);
        }
      },
    });
  };

  const handleDeleteRequest = async (collectionId: string, requestId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Request',
      message: 'Are you sure you want to delete this request? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await collectionsApi.deleteRequest(collectionId, requestId);
          await loadCollections();
        } catch (error) {
          console.error('Failed to delete request:', error);
        }
      },
    });
  };

  const handleCreateFolder = (collectionId: string, parentId?: string) => {
    setNewFolderInput({ collectionId, parentId });
    setFolderName('');
  };

  const handleSaveFolder = async () => {
    if (!newFolderInput || !folderName.trim()) return;

    try {
      await collectionsApi.addFolder(newFolderInput.collectionId, {
        name: folderName.trim(),
        parentId: newFolderInput.parentId,
      });
      await loadCollections();
      setNewFolderInput(null);
      setFolderName('');

      // Auto-expand the parent
      if (newFolderInput.parentId) {
        setExpandedFolders((prev) => new Set(prev).add(newFolderInput.parentId!));
      } else {
        setExpandedCollections((prev) => new Set(prev).add(newFolderInput.collectionId));
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const handleCancelFolder = () => {
    setNewFolderInput(null);
    setFolderName('');
  };

  const handleRequestContextMenu = (e: React.MouseEvent, request: SavedRequest) => {
    e.preventDefault();
    e.stopPropagation();
    setRequestContextMenu({ x: e.clientX, y: e.clientY, request });
  };

  const handleCollectionContextMenu = (e: React.MouseEvent, collectionId: string, collectionName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCollectionContextMenu({ x: e.clientX, y: e.clientY, collectionId, collectionName });
  };

  const handleRenameRequest = (request: SavedRequest) => {
    setRenameRequest(request);
    setRequestContextMenu(null);
  };

  const handleRenameCollection = (collectionId: string, collectionName: string) => {
    setRenameCollection({ id: collectionId, name: collectionName });
    setCollectionContextMenu(null);
  };

  const handleSaveRequestRename = async (newName: string) => {
    if (!renameRequest) return;

    await collectionsApi.updateRequest(renameRequest.collectionId, renameRequest.id, { name: newName });
    await loadCollections();
    setRenameRequest(null);
  };

  const handleSaveCollectionRename = async (newName: string) => {
    if (!renameCollection) return;

    await collectionsApi.update(renameCollection.id, { name: newName });
    await loadCollections();
    setRenameCollection(null);
  };

  const handleDeleteRequestFromContext = async () => {
    if (!requestContextMenu) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Request',
      message: 'Are you sure you want to delete this request? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await collectionsApi.deleteRequest(
            requestContextMenu.request.collectionId,
            requestContextMenu.request.id
          );
          await loadCollections();
        } catch (error) {
          console.error('Failed to delete request:', error);
        }
      },
    });
    setRequestContextMenu(null);
  };

  const handleDeleteCollectionFromContext = async () => {
    if (!collectionContextMenu) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Collection',
      message: 'Are you sure you want to delete this collection and all its requests? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await collectionsApi.delete(collectionContextMenu.collectionId);
          await loadCollections();
        } catch (error) {
          console.error('Failed to delete collection:', error);
        }
      },
    });
    setCollectionContextMenu(null);
  };

  return {
    collections,
    loading,
    activeRequestId,
    expandedCollections,
    expandedFolders,
    confirmDialog,
    newFolderInput,
    folderName,
    requestContextMenu,
    collectionContextMenu,
    renameRequest,
    renameCollection,
    setFolderName,
    setConfirmDialog,
    setRequestContextMenu,
    setCollectionContextMenu,
    setRenameRequest,
    setRenameCollection,
    toggleCollection,
    toggleFolder,
    handleSelectRequest,
    handleDeleteCollection,
    handleDeleteFolder,
    handleDeleteRequest,
    handleCreateFolder,
    handleSaveFolder,
    handleCancelFolder,
    handleRequestContextMenu,
    handleCollectionContextMenu,
    handleRenameRequest,
    handleRenameCollection,
    handleSaveRequestRename,
    handleSaveCollectionRename,
    handleDeleteRequestFromContext,
    handleDeleteCollectionFromContext,
  };
};
