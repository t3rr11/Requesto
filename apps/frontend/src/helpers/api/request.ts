import { ProxyRequest, ProxyResponse } from '../../types';

/**
 * Send an HTTP request via the proxy
 */
export const sendRequest = async (request: ProxyRequest): Promise<ProxyResponse> => {
  const response = await fetch('/api/proxy/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export const requestApi = {
  send: sendRequest,
};
