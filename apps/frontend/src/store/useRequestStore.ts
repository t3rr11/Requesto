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
  // Full request/response data for detailed view
  requestData?: ProxyRequest;
  responseData?: ProxyResponse;
}

interface RequestState {
  // Current request/response state (legacy - kept for backwards compatibility)
  response: ProxyResponse | null;
  loading: boolean;
  error: string | null;
  
  // Console logs
  consoleLogs: ConsoleLog[];
  
  // Actions
  setResponse: (response: ProxyResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  addConsoleLog: (log: ConsoleLog) => void;
  clearConsoleLogs: () => void;
}

export const useRequestStore = create<RequestState>((set) => ({
  response: null,
  loading: false,
  error: null,
  consoleLogs: [],
  
  setResponse: (response) => set({ response }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  addConsoleLog: (log) => set((state) => ({
    consoleLogs: [...state.consoleLogs, log],
  })),
  
  clearConsoleLogs: () => set({ consoleLogs: [] }),
}));
