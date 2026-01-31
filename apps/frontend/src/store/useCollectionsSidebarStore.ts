import { create } from 'zustand';
import { SavedRequest } from './useCollectionsStore';

interface ConfirmDialog {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

interface NewFolderInput {
  collectionId: string;
  parentId?: string;
}

interface RequestContextMenu {
  x: number;
  y: number;
  request: SavedRequest;
}

interface CollectionContextMenu {
  x: number;
  y: number;
  collectionId: string;
  collectionName: string;
}

interface FolderContextMenu {
  x: number;
  y: number;
  collectionId: string;
  folderId: string;
  folderName: string;
}

interface RenameRequest {
  request: SavedRequest;
}

interface RenameCollection {
  id: string;
  name: string;
}

interface RenameFolder {
  collectionId: string;
  id: string;
  name: string;
}

interface CollectionsSidebarState {
  // Confirm dialog
  confirmDialog: ConfirmDialog;
  setConfirmDialog: (dialog: ConfirmDialog) => void;
  closeConfirmDialog: () => void;
  
  // New folder input
  newFolderInput: NewFolderInput | null;
  folderName: string;
  setNewFolderInput: (input: NewFolderInput | null) => void;
  setFolderName: (name: string) => void;
  
  // Context menus
  requestContextMenu: RequestContextMenu | null;
  setRequestContextMenu: (menu: RequestContextMenu | null) => void;
  collectionContextMenu: CollectionContextMenu | null;
  setCollectionContextMenu: (menu: CollectionContextMenu | null) => void;
  folderContextMenu: FolderContextMenu | null;
  setFolderContextMenu: (menu: FolderContextMenu | null) => void;
  
  // Rename forms
  renameRequest: RenameRequest | null;
  setRenameRequest: (rename: RenameRequest | null) => void;
  renameCollection: RenameCollection | null;
  setRenameCollection: (rename: RenameCollection | null) => void;
  renameFolder: RenameFolder | null;
  setRenameFolder: (rename: RenameFolder | null) => void;
}

export const useCollectionsSidebarStore = create<CollectionsSidebarState>((set) => ({
  confirmDialog: {
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  },
  setConfirmDialog: (dialog) => set({ confirmDialog: dialog }),
  closeConfirmDialog: () => set({ 
    confirmDialog: { isOpen: false, title: '', message: '', onConfirm: () => {} } 
  }),
  
  newFolderInput: null,
  folderName: '',
  setNewFolderInput: (input) => set({ newFolderInput: input, folderName: '' }),
  setFolderName: (name) => set({ folderName: name }),
  
  requestContextMenu: null,
  setRequestContextMenu: (menu) => set({ requestContextMenu: menu }),
  
  collectionContextMenu: null,
  setCollectionContextMenu: (menu) => set({ collectionContextMenu: menu }),
  
  folderContextMenu: null,
  setFolderContextMenu: (menu) => set({ folderContextMenu: menu }),
  
  renameRequest: null,
  setRenameRequest: (rename) => set({ renameRequest: rename }),
  
  renameCollection: null,
  setRenameCollection: (rename) => set({ renameCollection: rename }),
  
  renameFolder: null,
  setRenameFolder: (rename) => set({ renameFolder: rename }),
}));
