import { create } from 'zustand';
import { ProxyResponse, ProxyRequest, StreamingResponse, ConsoleLog } from '../../types';
import * as actions from './actions';

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
  
  sendRequest: (request: ProxyRequest) => Promise<ProxyResponse>;
  sendStreamingRequest: (request: ProxyRequest, updateCallback: (response: StreamingResponse) => void) => Promise<StreamingResponse>;
  isStreamingRequest: (request: ProxyRequest) => boolean;
  
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
  
  // Action implementations
  sendRequest: (request) => actions.sendRequest(request),
  sendStreamingRequest: (request, updateCallback) => actions.sendStreamingRequest(request, updateCallback),
  isStreamingRequest: (request) => actions.isStreamingRequest(request),
  
  addConsoleLog: (log) => set((state) => ({
    consoleLogs: [...state.consoleLogs, log],
  })),
  
  clearConsoleLogs: () => set({ consoleLogs: [] }),
}));
