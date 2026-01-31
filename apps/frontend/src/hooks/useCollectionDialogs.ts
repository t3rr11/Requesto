import { useState, useCallback } from 'react';

export const useCollectionDialogs = () => {
  const [isNewCollectionOpen, setIsNewCollectionOpen] = useState(false);
  const [isSaveRequestOpen, setIsSaveRequestOpen] = useState(false);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [newRequestContext, setNewRequestContext] = useState<{
    collectionId?: string;
    folderId?: string;
  } | null>(null);
  const [currentRequest, setCurrentRequest] = useState<{
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
  } | null>(null);

  const openNewCollection = useCallback(() => {
    setIsNewCollectionOpen(true);
  }, []);

  const openSaveRequest = useCallback((request: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
  }) => {
    setCurrentRequest(request);
    setIsSaveRequestOpen(true);
  }, []);

  const openNewRequest = useCallback((collectionId?: string, folderId?: string) => {
    setNewRequestContext({ collectionId, folderId });
    setIsNewRequestOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsNewCollectionOpen(false);
    setIsSaveRequestOpen(false);
    setIsNewRequestOpen(false);
    setCurrentRequest(null);
    setNewRequestContext(null);
  }, []);

  return {
    isNewCollectionOpen,
    isSaveRequestOpen,
    isNewRequestOpen,
    currentRequest,
    newRequestContext,
    openNewCollection,
    openSaveRequest,
    openNewRequest,
    closeDialog,
  };
};
