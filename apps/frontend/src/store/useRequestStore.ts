import { create } from 'zustand';
import { ProxyResponse, ProxyRequest } from '../types';

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

export interface RequestCache {
  request: ProxyRequest;
  response: ProxyResponse | null;
}

interface CurrentRequestData {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  savedRequestId?: string;
}

interface RequestState {
  // Current request/response state
  response: ProxyResponse | null;
  loading: boolean;
  error: string | null;
  currentSavedRequestId: string | undefined;
  currentRequestData: CurrentRequestData | null;
  
  // Console logs
  consoleLogs: ConsoleLog[];
  
  // Request cache (for loaded saved requests)
  requestCache: Map<string, RequestCache>;
  
  // Actions
  setResponse: (response: ProxyResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentSavedRequestId: (id: string | undefined) => void;
  setCurrentRequestData: (data: CurrentRequestData | null) => void;
  
  addConsoleLog: (log: ConsoleLog) => void;
  clearConsoleLogs: () => void;
  
  cacheRequest: (requestId: string, request: ProxyRequest, response: ProxyResponse | null) => void;
  getRequestCache: (requestId: string) => RequestCache | undefined;
  clearCache: () => void;
}

export const useRequestStore = create<RequestState>((set, get) => ({
  response: null,
  loading: false,
  error: null,
  currentSavedRequestId: undefined,
  currentRequestData: null,
  consoleLogs: [],
  requestCache: new Map(),
  
  setResponse: (response) => set({ response }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  setCurrentSavedRequestId: (id) => set({ currentSavedRequestId: id }),
  
  setCurrentRequestData: (data) => set({ currentRequestData: data }),
  
  addConsoleLog: (log) => set((state) => ({
    consoleLogs: [...state.consoleLogs, log],
  })),
  
  clearConsoleLogs: () => set({ consoleLogs: [] }),
  
  cacheRequest: (requestId, request, response) => set((state) => {
    const newCache = new Map(state.requestCache);
    newCache.set(requestId, { request, response });
    return { requestCache: newCache };
  }),
  
  getRequestCache: (requestId) => {
    return get().requestCache.get(requestId);
  },
  
  clearCache: () => set({ requestCache: new Map() }),
}));
