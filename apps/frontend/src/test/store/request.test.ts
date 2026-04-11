import { describe, it, expect, beforeEach } from 'vitest';
import { useRequestStore } from '../../store/request/store';
import type { ConsoleLog } from '../../store/request/types';

describe('request store', () => {
  beforeEach(() => {
    useRequestStore.setState({
      response: null,
      loading: false,
      error: null,
      consoleLogs: [],
    });
  });

  it('starts with no response, not loading, no error', () => {
    const state = useRequestStore.getState();
    expect(state.response).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.consoleLogs).toEqual([]);
  });

  it('sets loading state', () => {
    useRequestStore.getState().setLoading(true);
    expect(useRequestStore.getState().loading).toBe(true);
  });

  it('sets response', () => {
    const mockResponse = {
      status: 200,
      statusText: 'OK',
      headers: {},
      body: '{"ok":true}',
      duration: 42,
      size: 11,
    };
    useRequestStore.getState().setResponse(mockResponse);
    expect(useRequestStore.getState().response).toEqual(mockResponse);
  });

  it('sets error', () => {
    useRequestStore.getState().setError('Network timeout');
    expect(useRequestStore.getState().error).toBe('Network timeout');
  });

  it('clears response', () => {
    useRequestStore.getState().setResponse({
      status: 200,
      statusText: 'OK',
      headers: {},
      body: '',
      duration: 0,
    });
    useRequestStore.getState().setResponse(null);
    expect(useRequestStore.getState().response).toBeNull();
  });

  it('adds console logs', () => {
    const log: ConsoleLog = {
      id: 'log1',
      timestamp: Date.now(),
      type: 'request',
      method: 'GET',
      url: 'https://api.example.com',
    };
    useRequestStore.getState().addConsoleLog(log);
    expect(useRequestStore.getState().consoleLogs).toHaveLength(1);
    expect(useRequestStore.getState().consoleLogs[0]).toEqual(log);
  });

  it('clears console logs', () => {
    useRequestStore.getState().addConsoleLog({
      id: 'log1',
      timestamp: Date.now(),
      type: 'request',
      method: 'GET',
      url: 'https://api.example.com',
    });
    useRequestStore.getState().clearConsoleLogs();
    expect(useRequestStore.getState().consoleLogs).toEqual([]);
  });

  it('identifies streaming requests by Accept header', () => {
    const streamReq = {
      method: 'GET' as const,
      url: 'https://api.example.com/events',
      headers: { Accept: 'text/event-stream' },
      body: '',
    };
    expect(useRequestStore.getState().isStreamingRequest(streamReq)).toBe(true);
  });

  it('identifies non-streaming requests', () => {
    const normalReq = {
      method: 'GET' as const,
      url: 'https://api.example.com/data',
      headers: {},
      body: '',
    };
    expect(useRequestStore.getState().isStreamingRequest(normalReq)).toBe(false);
  });
});
