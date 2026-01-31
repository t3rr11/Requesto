import { useCallback } from 'react';
import { ProxyRequest } from '../types';
import { sendRequest } from '../helpers/api';
import { useAppStore } from '../store/store';

export const useRequestHandler = () => {
  const { setResponse, setLoading, setError, addConsoleLog, activeRequestId, setRequestCache } = useAppStore();

  const handleSendRequest = useCallback(
    async (request: ProxyRequest) => {
      setLoading(true);
      setError(null);
      setResponse(null);

      // Log request start
      addConsoleLog({
        type: 'request',
        method: request.method,
        url: request.url,
      });

      try {
        const data = await sendRequest(request);
        setResponse(data);

        // Cache the request/response if this is from a saved request
        if (activeRequestId) {
          setRequestCache(activeRequestId, {
            request,
            response: data,
          });
        }

        // Log successful response
        addConsoleLog({
          type: 'response',
          method: request.method,
          url: request.url,
          status: data.status,
          duration: data.duration,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);

        // Log error
        addConsoleLog({
          type: 'error',
          method: request.method,
          url: request.url,
          message: errorMessage,
        });
      } finally {
        setLoading(false);
      }
    },
    [setResponse, setLoading, setError, addConsoleLog, activeRequestId, setRequestCache]
  );

  return { handleSendRequest };
};
