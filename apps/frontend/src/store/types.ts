import { ProxyResponse, ProxyRequest } from '../types';

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
}

export interface EnvironmentVariable {
  key: string;
  value: string;
  enabled: boolean;
}

export interface EnvironmentsData {
  activeEnvironmentId: string | null;
  environments: Environment[];
}

export interface HistoryItem {
  id: string;
  method: string;
  url: string;
  status: number;
  duration: number;
  timestamp: number;
  headers?: Record<string, string>;
  body?: string;
}

export interface SavedRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  collectionId: string;
  folderId?: string;
  order?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string; // Optional parent folder ID for nesting
  collectionId: string;
  createdAt: number;
  updatedAt: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  folders: Folder[];
  requests: SavedRequest[];
  createdAt: number;
  updatedAt: number;
}

export interface RequestCache {
  request: ProxyRequest;
  response: ProxyResponse | null;
}

export interface ConsoleLog {
  id: string;
  timestamp: number;
  type: 'request' | 'response' | 'error' | 'info';
  method?: string;
  url?: string;
  status?: number;
  duration?: number;
  message?: string;
}

export interface AppState {
  // Request state
  response: ProxyResponse | null;
  loading: boolean;
  error: string | null;
  
  // UI state
  isSidebarOpen: boolean;
  isConsoleOpen: boolean;
  consoleHeight: number;
  isEnvironmentManagerOpen: boolean;
  isKeyboardShortcutsOpen: boolean;
  
  // Environment state
  environmentsData: EnvironmentsData;
  
  // Collections state
  collections: Collection[];
  activeCollectionId: string | null;
  activeRequestId: string | null;
  
  // Request cache (in-memory only, not persisted)
  requestCache: Map<string, RequestCache>; // key: savedRequestId
  
  // Console logs
  consoleLogs: ConsoleLog[];
}

export interface AppActions {
  // Request actions
  setResponse: (response: ProxyResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // UI actions
  setIsSidebarOpen: (isOpen: boolean) => void;
  toggleSidebar: () => void;
  setIsConsoleOpen: (isOpen: boolean) => void;
  toggleConsole: () => void;
  setConsoleHeight: (height: number) => void;
  setIsEnvironmentManagerOpen: (isOpen: boolean) => void;
  setIsKeyboardShortcutsOpen: (isOpen: boolean) => void;
  
  // Environment actions
  setEnvironmentsData: (data: EnvironmentsData) => void;
  
  // Collections actions
  setCollections: (collections: Collection[]) => void;
  addCollection: (collection: Collection) => void;
  updateCollection: (id: string, updates: Partial<Collection>) => void;
  deleteCollection: (id: string) => void;
  setActiveCollection: (id: string | null) => void;
  setActiveRequest: (id: string | null) => void;
  addRequestToCollection: (collectionId: string, request: SavedRequest) => void;
  updateRequest: (collectionId: string, requestId: string, updates: Partial<SavedRequest>) => void;
  deleteRequest: (collectionId: string, requestId: string) => void;
  
  // Folder actions
  addFolder: (collectionId: string, folder: Folder) => void;
  updateFolder: (collectionId: string, folderId: string, updates: Partial<Folder>) => void;
  deleteFolder: (collectionId: string, folderId: string) => void;
  
  // Request cache actions
  setRequestCache: (requestId: string, cache: RequestCache) => void;
  getRequestCache: (requestId: string) => RequestCache | undefined;
  clearRequestCache: () => void;
  
  // Console actions
  addConsoleLog: (log: Omit<ConsoleLog, 'id' | 'timestamp'>) => void;
  clearConsoleLogs: () => void;
}
