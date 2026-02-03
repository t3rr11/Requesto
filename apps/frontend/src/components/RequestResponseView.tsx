import { forwardRef, useImperativeHandle, useEffect, useState, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from './Button';
import { RequestBreadcrumb } from './RequestBreadcrumb';
import { RequestForm, requestFormSchema, type RequestFormData } from '../forms/RequestForm';
import { ResponsePanel } from './ResponsePanel';
import { useRequestStore } from '../store/useRequestStore';
import { useCollectionsStore } from '../store/useCollectionsStore';
import { useAlertStore } from '../store/useAlertStore';
import { useEnvironmentStore } from '../store/useEnvironmentStore';
import { requestApi } from '../helpers/api/request';
import { substituteInRequest, getUndefinedVariables } from '../helpers/environmentHelpers';
import { useUIStore } from '../store/useUIStore';
import { useTabsStore } from '../store/useTabsStore';

export interface RequestResponseViewRef {
  loadRequest: (item: { method: string; url: string; headers?: Record<string, string>; body?: string }) => void;
  getCurrentRequest: () => { method: string; url: string; headers?: Record<string, string>; body?: string } | null;
  setSavedRequestId: (id: string | undefined) => void;
  clearRequest: () => void;
}

const RequestResponseView = forwardRef<RequestResponseViewRef, {}>(function RequestResponseView(_, ref) {
  const { getActiveTab, updateTabRequest, setTabResponse, setTabLoading, setTabError, markTabAsSaved, activeTabId } =
    useTabsStore();

  const { addConsoleLog } = useRequestStore();
  const { collections, updateRequest: updateCollectionRequest } = useCollectionsStore();
  const { showAlert } = useAlertStore();
  const { environmentsData } = useEnvironmentStore();
  const { openSaveRequest, requestPanelWidth, setRequestPanelWidth } = useUIStore();
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeTab = getActiveTab();
  
  // Get the active environment
  const activeEnvironment = useMemo(() => {
    if (!environmentsData.activeEnvironmentId) return null;
    return environmentsData.environments.find(e => e.id === environmentsData.activeEnvironmentId) || null;
  }, [environmentsData]);

  const { control, watch, setValue, getValues, reset } = useForm<RequestFormData>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      method: 'GET',
      url: '',
      headers: [{ id: '1', key: '', value: '', enabled: true }],
      params: [{ id: '1', key: '', value: '', enabled: true }],
      body: '',
      auth: { type: 'none' },
      savedRequestId: undefined,
    },
  });

  const formValues = watch();
  const savedRequestId = watch('savedRequestId');

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;
      const clampedWidth = Math.max(300, Math.min(newWidth, containerRect.width - 300));
      setRequestPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setRequestPanelWidth]);

  // Check if form has changes compared to initial state
  const hasChanges = useMemo(() => {
    // Use the active tab's isDirty state
    return activeTab?.isDirty || false;
  }, [activeTab]);

  // Load active tab's request into form when tab changes
  useEffect(() => {
    if (!activeTab) return;

    const loadedHeaders =
      activeTab.request.headers && Object.keys(activeTab.request.headers).length > 0
        ? Object.entries(activeTab.request.headers).map(([key, value], index) => ({
            id: Date.now().toString() + index,
            key,
            value,
            enabled: true,
          }))
        : [{ id: Date.now().toString(), key: '', value: '', enabled: true }];

    // Extract params from URL if present
    const { baseUrl, params: extractedParams } = extractParamsFromUrl(activeTab.request.url);
    const loadedParams = extractedParams.length > 0
      ? extractedParams.map((p, index) => ({
          id: (Date.now() + index + 1000).toString(),
          key: p.key,
          value: p.value,
          enabled: true,
        }))
      : [{ id: (Date.now() + 1000).toString(), key: '', value: '', enabled: true }];

    const formData = {
      method: activeTab.request.method,
      url: baseUrl, // Use base URL without query params
      headers: loadedHeaders,
      params: loadedParams,
      body: activeTab.request.body || '',
      auth: (activeTab.request as any).auth || { type: 'none' as const },
      savedRequestId: activeTab.savedRequestId,
    };

    reset(formData);
  }, [activeTab?.id, reset]); // Only reload when tab ID changes

/**
 * Extract query parameters from URL and return both the base URL and params
 */
function extractParamsFromUrl(url: string): { baseUrl: string; params: { key: string; value: string }[] } {
  try {
    // Check if URL has a protocol, if not, try to parse as a relative URL
    let urlObj: URL;
    if (url.match(/^https?:\/\//i)) {
      urlObj = new URL(url);
    } else {
      // For relative URLs or URLs without protocol, add a dummy base
      urlObj = new URL(url, 'http://dummy');
    }

    const params: { key: string; value: string }[] = [];
    urlObj.searchParams.forEach((value, key) => {
      params.push({ key, value });
    });

    // Build base URL without query params
    let baseUrl = url.split('?')[0];
    
    return { baseUrl, params };
  } catch {
    // If URL parsing fails, return as-is
    return { baseUrl: url, params: [] };
  }
}

/**
 * Build URL from base URL and params
 */
function buildUrlWithParams(baseUrl: string, params: Array<{ key: string; value: string; enabled: boolean }>): string {
  const enabledParams = params.filter(p => p.enabled && p.key.trim());
  if (enabledParams.length === 0) return baseUrl;

  const queryString = enabledParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${queryString}`;
}

  // Sync form changes back to active tab
  useEffect(() => {
    if (!activeTab || !activeTabId) return;

    // Build headers object
    const requestHeaders: Record<string, string> = {};
    formValues.headers.forEach(h => {
      if (h.enabled && h.key.trim()) {
        requestHeaders[h.key.trim()] = h.value;
      }
    });

    // Build URL with params
    const fullUrl = buildUrlWithParams(formValues.url.trim(), formValues.params);

    // Update the tab's request data
    updateTabRequest(activeTabId, {
      method: formValues.method,
      url: fullUrl,
      headers: Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined,
      body: formValues.body.trim() || undefined,
      auth: formValues.auth,
    } as any);
  }, [formValues.method, formValues.url, formValues.headers, formValues.params, formValues.body, formValues.auth, activeTabId, updateTabRequest]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to send request
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const currentUrl = getValues('url');
        if (!activeTab?.isLoading && currentUrl.trim()) {
          handleSend();
        }
      }
      // Ctrl/Cmd + S to save request
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const currentUrl = getValues('url');
        if (hasChanges && !activeTab?.isLoading && currentUrl.trim()) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab?.isLoading, getValues, hasChanges]);

  const handleSend = async () => {
    if (!activeTab || !activeTabId) return;

    const values = getValues();
    if (!values.url.trim()) {
      return;
    }

    // Build headers object
    const requestHeaders: Record<string, string> = {};
    values.headers.forEach(h => {
      if (h.enabled && h.key.trim()) {
        requestHeaders[h.key.trim()] = h.value;
      }
    });

    // Build URL with params
    const fullUrl = buildUrlWithParams(values.url.trim(), values.params);

    const requestData = {
      method: values.method,
      url: fullUrl,
      headers: Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined,
      body: values.body.trim() || undefined,
      auth: values.auth,
    };

    // Check for undefined variables
    const undefinedVars = getUndefinedVariables(requestData, activeEnvironment);
    if (undefinedVars.length > 0) {
      const confirmed = confirm(
        `The following variables are not defined in the active environment:\n\n${undefinedVars.map(v => `• {{${v}}}`).join('\n')}\n\nDo you want to send the request anyway?`
      );
      if (!confirmed) return;
    }

    // Substitute environment variables
    const substitutedRequest = substituteInRequest(requestData, activeEnvironment);

    setTabLoading(activeTabId, true);
    setTabError(activeTabId, null);

    const startTime = Date.now();
    addConsoleLog({
      id: Date.now().toString(),
      timestamp: startTime,
      type: 'request',
      method: substitutedRequest.method,
      url: substitutedRequest.url,
      requestData: substitutedRequest,
    });

    try {
      // Check if this is a streaming request
      if (requestApi.isStreaming(substitutedRequest)) {
        // Handle streaming separately with progressive updates
        await requestApi.sendStreaming(substitutedRequest, (streamResponse) => {
          // Use flushSync to force immediate render, bypassing React 18's automatic batching
          flushSync(() => {
            setTabResponse(activeTabId, streamResponse);
          });
        });
        
        const duration = Date.now() - startTime;
        const finalResponse = getActiveTab()?.response;
        
        if (finalResponse) {
          addConsoleLog({
            id: (Date.now() + 1).toString(),
            timestamp: Date.now(),
            type: 'response',
            method: substitutedRequest.method,
            url: substitutedRequest.url,
            status: finalResponse.status,
            duration,
            requestData: substitutedRequest,
            responseData: finalResponse,
          });
        }
      } else {
        // Regular non-streaming request
        const response = await requestApi.send(substitutedRequest);
        const duration = Date.now() - startTime;

        setTabResponse(activeTabId, response);
        addConsoleLog({
          id: (Date.now() + 1).toString(),
          timestamp: Date.now(),
          type: 'response',
          method: substitutedRequest.method,
          url: substitutedRequest.url,
          status: response.status,
          duration,
          requestData: substitutedRequest,
          responseData: response,
        });
      }
    } catch (error: any) {
      setTabError(activeTabId, error.message || 'Failed to send request');
      addConsoleLog({
        id: (Date.now() + 1).toString(),
        timestamp: Date.now(),
        type: 'error',
        message: error.message || 'Failed to send request',
        method: substitutedRequest.method,
        url: substitutedRequest.url,
        requestData: substitutedRequest,
      });
    } finally {
      setTabLoading(activeTabId, false);
    }
  };

  const handleSave = async () => {
    if (!activeTab || !activeTabId) return;

    const values = getValues();
    if (!values.url.trim()) return;

    // Build headers object
    const requestHeaders: Record<string, string> = {};
    values.headers.forEach(h => {
      if (h.enabled && h.key.trim()) {
        requestHeaders[h.key.trim()] = h.value;
      }
    });

    // Build URL with params
    const fullUrl = buildUrlWithParams(values.url.trim(), values.params);

    const requestData = {
      method: values.method,
      url: fullUrl,
      headers: Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined,
      body: values.body.trim() || undefined,
      auth: values.auth,
    };

    // If no savedRequestId, open save dialog to create new request
    if (!values.savedRequestId) {
      openSaveRequest();
      return;
    }

    const collection = collections.find(c => c.requests.some(r => r.id === values.savedRequestId));

    // If collection not found (request was deleted), treat as new request
    if (!collection) {
      setValue('savedRequestId', undefined);
      openSaveRequest();
      return;
    }

    try {
      await updateCollectionRequest(collection.id, values.savedRequestId!, {
        method: requestData.method,
        url: requestData.url,
        headers: requestData.headers,
        body: requestData.body,
        auth: requestData.auth,
      });

      // Mark tab as saved (clears dirty flag and updates original request)
      markTabAsSaved(activeTabId, values.savedRequestId!, collection.id);

      // Update form's savedRequestId
      setValue('savedRequestId', values.savedRequestId);
    } catch (error) {
      showAlert('Update Failed', 'Failed to update the request. Please try again.', 'error');
      console.error('Failed to update request:', error);
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      loadRequest: (item: { method: string; url: string; headers?: Record<string, string>; body?: string }) => {
        const loadedHeaders =
          item.headers && Object.keys(item.headers).length > 0
            ? Object.entries(item.headers).map(([key, value], index) => ({
                id: Date.now().toString() + index,
                key,
                value,
                enabled: true,
              }))
            : [{ id: Date.now().toString(), key: '', value: '', enabled: true }];

        // Extract params from URL if present
        const { baseUrl, params: extractedParams } = extractParamsFromUrl(item.url);
        const loadedParams = extractedParams.length > 0
          ? extractedParams.map((p, index) => ({
              id: (Date.now() + index + 1000).toString(),
              key: p.key,
              value: p.value,
              enabled: true,
            }))
          : [{ id: (Date.now() + 1000).toString(), key: '', value: '', enabled: true }];

        const formData = {
          method: item.method,
          url: baseUrl, // Use base URL without query params
          headers: loadedHeaders,
          params: loadedParams,
          body: item.body || '',
          auth: (item as any).auth || { type: 'none' as const },
          savedRequestId: undefined,
        };

        reset(formData);
      },
      getCurrentRequest: () => {
        const values = getValues();
        if (!values.url.trim()) {
          return null;
        }

        const requestHeaders: Record<string, string> = {};
        values.headers.forEach(h => {
          if (h.enabled && h.key.trim()) {
            requestHeaders[h.key] = h.value;
          }
        });

        // Build URL with params
        const fullUrl = buildUrlWithParams(values.url.trim(), values.params);

        return {
          method: values.method,
          url: fullUrl,
          headers: Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined,
          body: values.body.trim() || undefined,
        };
      },
      setSavedRequestId: (id: string | undefined) => {
        setValue('savedRequestId', id);
      },
      clearRequest: () => {
        if (!activeTab || !activeTabId) return;

        const formData = {
          method: 'GET' as const,
          url: '',
          headers: [{ id: Date.now().toString(), key: '', value: '', enabled: true }],
          params: [{ id: (Date.now() + 1000).toString(), key: '', value: '', enabled: true }],
          body: '',
          auth: { type: 'none' as const },
          savedRequestId: undefined,
        };
        reset(formData);
        setTabResponse(activeTabId, null);
        setTabError(activeTabId, null);
      },
    }),
    [getValues, reset, setValue, setTabResponse, setTabError, activeTab, activeTabId]
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-gray-50">
      {/* Top Bar - Breadcrumb and Save */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between h-14 flex-shrink-0">
        <RequestBreadcrumb savedRequestId={savedRequestId} />
        <Button onClick={handleSave} size="sm" disabled={activeTab?.isLoading || !hasChanges}>
          Save
        </Button>
      </div>

      {/* Main Content - Split View */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative min-h-0">
        <div
          className="flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 relative"
          style={{ width: `${requestPanelWidth}px` }}
        >
          <RequestForm
            control={control}
            onSend={handleSend}
            loading={activeTab?.isLoading || false}
            urlValue={formValues.url}
            headers={formValues.headers}
            onHeadersChange={headers => setValue('headers', headers)}
            params={formValues.params}
            onParamsChange={params => setValue('params', params)}
            onUrlChange={url => setValue('url', url)}
            auth={formValues.auth}
            onAuthChange={auth => setValue('auth', auth, { shouldDirty: true })}
          />
          {/* Resize Handle */}
          <div
            className="absolute top-0 right-0 w-1 h-full bg-transparent hover:bg-orange-500 dark:hover:bg-orange-600 cursor-ew-resize transition-colors z-10"
            onMouseDown={handleMouseDown}
            title="Drag to resize"
          />
        </div>
        <div style={{ pointerEvents: isResizing ? 'none' : 'auto' }} className="flex-1 flex flex-col overflow-hidden min-h-0">
          <ResponsePanel />
        </div>
      </div>
    </div>
  );
});

RequestResponseView.displayName = 'RequestResponseView';

export default RequestResponseView;
