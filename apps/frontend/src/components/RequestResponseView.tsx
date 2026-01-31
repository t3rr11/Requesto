import { forwardRef, useImperativeHandle, useEffect, useState, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from './Button';
import { RequestBreadcrumb } from './RequestBreadcrumb';
import { RequestForm, requestFormSchema, type RequestFormData } from '../forms/RequestForm';
import { ResponsePanel } from './ResponsePanel';
import { useRequestStore } from '../store/useRequestStore';
import { useCollectionsStore } from '../store/useCollectionsStore';
import { useAlertStore } from '../store/useAlertStore';
import { requestApi } from '../helpers/api/request';
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
  const { openSaveRequest, requestPanelWidth, setRequestPanelWidth } = useUIStore();
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeTab = getActiveTab();

  const { control, watch, setValue, getValues, reset } = useForm<RequestFormData>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      method: 'GET',
      url: '',
      headers: [{ id: '1', key: '', value: '', enabled: true }],
      body: '',
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

    const formData = {
      method: activeTab.request.method,
      url: activeTab.request.url,
      headers: loadedHeaders,
      body: activeTab.request.body || '',
      savedRequestId: activeTab.savedRequestId,
    };

    reset(formData);
  }, [activeTab?.id, reset]); // Only reload when tab ID changes

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

    // Update the tab's request data
    updateTabRequest(activeTabId, {
      method: formValues.method,
      url: formValues.url.trim(),
      headers: Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined,
      body: formValues.body.trim() || undefined,
    });
  }, [formValues.method, formValues.url, formValues.headers, formValues.body, activeTabId, updateTabRequest]);

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

    const requestData = {
      method: values.method,
      url: values.url.trim(),
      headers: Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined,
      body: values.body.trim() || undefined,
    };

    setTabLoading(activeTabId, true);
    setTabError(activeTabId, null);

    const startTime = Date.now();
    addConsoleLog({
      id: Date.now().toString(),
      timestamp: startTime,
      type: 'request',
      method: requestData.method,
      url: requestData.url,
    });

    try {
      const response = await requestApi.send(requestData);
      const duration = Date.now() - startTime;

      setTabResponse(activeTabId, response);
      addConsoleLog({
        id: (Date.now() + 1).toString(),
        timestamp: Date.now(),
        type: 'response',
        method: requestData.method,
        url: requestData.url,
        status: response.status,
        duration,
      });
    } catch (error: any) {
      setTabError(activeTabId, error.message || 'Failed to send request');
      addConsoleLog({
        id: (Date.now() + 1).toString(),
        timestamp: Date.now(),
        type: 'error',
        message: error.message || 'Failed to send request',
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

    const requestData = {
      method: values.method,
      url: values.url.trim(),
      headers: Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined,
      body: values.body.trim() || undefined,
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

        const formData = {
          method: item.method,
          url: item.url,
          headers: loadedHeaders,
          body: item.body || '',
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

        return {
          method: values.method,
          url: values.url.trim(),
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
          body: '',
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
    <div className="flex flex-col h-full bg-gray-50">
      {/* Top Bar - Breadcrumb and Save */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between h-14">
        <RequestBreadcrumb savedRequestId={savedRequestId} />
        <Button onClick={handleSave} size="sm" disabled={activeTab?.isLoading || !hasChanges}>
          Save
        </Button>
      </div>

      {/* Main Content - Split View */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
        <div
          className="flex flex-col border-r border-gray-200 bg-white relative"
          style={{ width: `${requestPanelWidth}px` }}
        >
          <RequestForm
            control={control}
            onSend={handleSend}
            loading={activeTab?.isLoading || false}
            urlValue={formValues.url}
            headers={formValues.headers}
            onHeadersChange={headers => setValue('headers', headers)}
          />
          {/* Resize Handle */}
          <div
            className="absolute top-0 right-0 w-1 h-full bg-transparent hover:bg-orange-500 cursor-ew-resize transition-colors z-10"
            onMouseDown={handleMouseDown}
            title="Drag to resize"
          />
        </div>
        <div style={{ pointerEvents: isResizing ? 'none' : 'auto' }} className="flex-1 flex flex-col overflow-hidden">
          <ResponsePanel />
        </div>
      </div>
    </div>
  );
});

RequestResponseView.displayName = 'RequestResponseView';

export default RequestResponseView;
