import { create } from 'zustand';
import type { ProxyResponse, ProxyRequest, StreamingResponse } from './types';
import type { ConsoleLog } from './types';
import * as actions from './actions';

export { createSSEConnection, SSEClient } from './actions';
export type { SSEEventHandler } from './actions';

type RequestState = {
  response: ProxyResponse | null;
  loading: boolean;
  error: string | null;
  consoleLogs: ConsoleLog[];

  setResponse: (response: ProxyResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  sendRequest: (request: ProxyRequest, signal?: AbortSignal) => Promise<ProxyResponse>;
  sendStreamingRequest: (
    request: ProxyRequest,
    onUpdate: (response: StreamingResponse) => void,
    signal?: AbortSignal,
  ) => Promise<StreamingResponse>;
  isStreamingRequest: (request: ProxyRequest) => boolean;
  addConsoleLog: (log: ConsoleLog) => void;
  clearConsoleLogs: () => void;
};

export const useRequestStore = create<RequestState>((set) => ({
  response: null,
  loading: false,
  error: null,
  consoleLogs: [],

  setResponse: (response) => set({ response }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  sendRequest: (request, signal) => actions.sendRequest(request, signal),
  sendStreamingRequest: (request, onUpdate, signal) => actions.sendStreamingRequest(request, onUpdate, signal),
  isStreamingRequest: (request) => actions.isStreamingRequest(request),

  addConsoleLog: (log) =>
    set((state) => ({ consoleLogs: [...state.consoleLogs, log] })),
  clearConsoleLogs: () => set({ consoleLogs: [] }),
}));
