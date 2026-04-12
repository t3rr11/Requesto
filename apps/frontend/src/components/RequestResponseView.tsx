import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Play, AlertTriangle } from 'lucide-react';
import { useTabsStore } from '../store/tabs/store';
import { useCollectionsStore } from '../store/collections/store';
import { useEnvironmentStore } from '../store/environments/store';
import { useRequestStore } from '../store/request/store';
import { useUIStore } from '../store/ui/store';
import { useAlertStore } from '../store/alert/store';
import { useThemeStore } from '../store/theme/store';
import { RequestForm, requestFormSchema, type RequestFormData } from '../forms/RequestForm';
import { ResponsePanel } from './ResponsePanel';
import { RequestBreadcrumb } from './RequestBreadcrumb';
import { SaveRequestForm } from '../forms/SaveRequestForm';
import { Dialog } from './Dialog';
import { Button } from './Button';
import { useDialog } from '../hooks/useDialog';
import { substituteInRequest, getUndefinedVariables } from '../helpers/environment';
import { extractParamsFromUrl } from '../helpers/url';
import type { AuthConfig, FormDataEntry, StreamingResponse } from '../store/request/types';

export interface RequestResponseViewHandle {
  sendCurrentRequest: () => void;
  saveCurrentRequest: () => void;
}

function buildUrlWithParams(baseUrl: string, params: RequestFormData['params']): string {
  const enabledParams = params.filter(p => p.enabled && p.key.trim());
  if (enabledParams.length === 0) return baseUrl;

  const queryString = enabledParams.map(p => `${p.key}=${p.value}`).join('&');
  return baseUrl.includes('?') ? `${baseUrl}&${queryString}` : `${baseUrl}?${queryString}`;
}

export const RequestResponseView = forwardRef<RequestResponseViewHandle>((_props, ref) => {
  const { getActiveTab, updateTabRequest, setTabResponse, setTabLoading, setTabError, markTabAsSaved } =
    useTabsStore();
  const { updateRequest } = useCollectionsStore();
  const { environmentsData } = useEnvironmentStore();
  const { sendRequest, sendStreamingRequest, isStreamingRequest, addConsoleLog } = useRequestStore();
  const { panelLayout, requestPanelWidth, requestPanelHeight, setRequestPanelWidth, setRequestPanelHeight } =
    useUIStore();
  const { showAlert } = useAlertStore();
  const { isDarkMode } = useThemeStore();

  const saveDialog = useDialog();
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeTab = getActiveTab();

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      method: 'GET',
      url: '',
      headers: [{ id: '1', key: '', value: '', enabled: true }],
      params: [{ id: '1', key: '', value: '', enabled: true }],
      body: '',
      bodyType: 'json' as const,
      formDataEntries: [{ id: '1', key: '', value: '', type: 'text' as const, enabled: true }],
      auth: { type: 'none' },
    },
  });

  const { control, watch, setValue, reset, getValues } = form;

  const urlValue = watch('url');
  const headers = watch('headers');
  const params = watch('params');
  const auth = watch('auth') as AuthConfig;
  const bodyType = watch('bodyType');
  const formDataEntries = watch('formDataEntries');

  // Sync form with active tab
  useEffect(() => {
    if (!activeTab) return;
    const tabReq = activeTab.request;
    const { baseUrl, params: urlParams } = extractParamsFromUrl(tabReq.url || '');

    reset({
      method: tabReq.method || 'GET',
      url: baseUrl,
      headers: tabReq.headers && Object.keys(tabReq.headers).length > 0
        ? Object.entries(tabReq.headers).map(([key, value]) => ({
            id: `${key}-${Date.now()}`,
            key,
            value,
            enabled: true,
          }))
        : [{ id: Date.now().toString(), key: '', value: '', enabled: true }],
      params:
        urlParams.length > 0
          ? urlParams.map(p => ({
              id: `${p.key}-${Date.now()}`,
              key: p.key,
              value: p.value,
              enabled: true,
            }))
          : [{ id: (Date.now() + 1000).toString(), key: '', value: '', enabled: true }],
      body: tabReq.body || '',
      bodyType: tabReq.bodyType || 'json',
      formDataEntries: tabReq.formDataEntries && tabReq.formDataEntries.length > 0
        ? tabReq.formDataEntries
        : [{ id: Date.now().toString(), key: '', value: '', type: 'text' as const, enabled: true }],
      auth: tabReq.auth || { type: 'none' },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab?.id]);

  // Update tab request when form changes
  useEffect(() => {
    if (!activeTab) return;
    const subscription = watch(data => {
      const fullUrl = buildUrlWithParams(data.url || '', (data.params || []) as RequestFormData['params']);
      const headersObj: Record<string, string> = {};
      ((data.headers || []) as RequestFormData['headers']).forEach(h => {
        if (h && h.enabled && h.key?.trim()) {
          headersObj[h.key] = h.value || '';
        }
      });

      updateTabRequest(activeTab.id, {
        method: data.method || 'GET',
        url: fullUrl,
        headers: headersObj,
        body: data.body,
        bodyType: data.bodyType || 'json',
        formDataEntries: data.formDataEntries as FormDataEntry[],
        auth: data.auth as AuthConfig,
      });
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab?.id, updateTabRequest]);

  const handleSend = useCallback(async () => {
    if (!activeTab) return;

    const formData = getValues();
    const fullUrl = buildUrlWithParams(formData.url, formData.params);
    const headersObj: Record<string, string> = {};
    formData.headers.forEach(h => {
      if (h.enabled && h.key.trim()) {
        headersObj[h.key] = h.value;
      }
    });

    const rawRequest = {
      method: formData.method,
      url: fullUrl,
      headers: headersObj,
      body: formData.bodyType === 'json' ? (formData.body || undefined) : undefined,
      bodyType: formData.bodyType,
      formDataEntries: formData.bodyType !== 'json'
        ? formData.formDataEntries.filter(e => e.enabled && e.key.trim())
        : undefined,
      auth: formData.auth as AuthConfig,
    };

    // Get active environment and substitute variables
    const activeEnv = environmentsData.environments.find(e => e.id === environmentsData.activeEnvironmentId);
    const request = activeEnv ? substituteInRequest(rawRequest, activeEnv) : rawRequest;

    // Warn about undefined variables
    if (activeEnv) {
      const undefinedVars = getUndefinedVariables(rawRequest, activeEnv);
      if (undefinedVars.length > 0) {
        showAlert(
          'Warning',
          `Undefined variables: ${undefinedVars.join(', ')}`,
          'warning',
        );
      }
    }

    // Generate a shared ID to link request/response/error logs together
    const requestId = crypto.randomUUID();

    // Add console log
    addConsoleLog({
      id: `req-${Date.now()}`,
      requestId,
      timestamp: Date.now(),
      type: 'request',
      method: request.method,
      url: request.url,
      requestData: request,
    });

    setTabLoading(activeTab.id, true);
    setTabError(activeTab.id, null);

    try {
      if (isStreamingRequest(request)) {
        const streamResponse = await sendStreamingRequest(request, (partial: StreamingResponse) => {
          setTabResponse(activeTab.id, partial);
        });
        setTabResponse(activeTab.id, streamResponse);
        addConsoleLog({
          id: `res-${Date.now()}`,
          requestId,
          timestamp: Date.now(),
          type: 'response',
          method: request.method,
          url: request.url,
          status: streamResponse.status,
          duration: streamResponse.duration,
          responseData: streamResponse,
        });
      } else {
        const response = await sendRequest(request);
        setTabResponse(activeTab.id, response);
        addConsoleLog({
          id: `res-${Date.now()}`,
          requestId,
          timestamp: Date.now(),
          type: 'response',
          method: request.method,
          url: request.url,
          status: response.status,
          duration: response.duration,
          responseData: response,
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Request failed';
      setTabError(activeTab.id, errorMsg);
      addConsoleLog({
        id: `err-${Date.now()}`,
        requestId,
        timestamp: Date.now(),
        type: 'error',
        method: request.method,
        url: request.url,
        message: errorMsg,
      });
    } finally {
      setTabLoading(activeTab.id, false);
    }
  }, [
    activeTab,
    getValues,
    environmentsData,
    sendRequest,
    sendStreamingRequest,
    isStreamingRequest,
    setTabLoading,
    setTabError,
    setTabResponse,
    addConsoleLog,
    showAlert,
  ]);

  const handleSave = useCallback(async () => {
    if (!activeTab) return;

    if (activeTab.savedRequestId && activeTab.collectionId) {
      // Update existing saved request
      const formData = getValues();
      const fullUrl = buildUrlWithParams(formData.url, formData.params);
      const headersObj: Record<string, string> = {};
      formData.headers.forEach(h => {
        if (h.enabled && h.key.trim()) {
          headersObj[h.key] = h.value;
        }
      });

      try {
        await updateRequest(activeTab.collectionId, activeTab.savedRequestId, {
          method: formData.method,
          url: fullUrl,
          headers: headersObj,
          body: formData.body || undefined,
          bodyType: formData.bodyType,
          formDataEntries: formData.formDataEntries,
          auth: formData.auth as AuthConfig,
        });
        markTabAsSaved(activeTab.id, activeTab.savedRequestId, activeTab.collectionId);
      } catch {
        showAlert('Failed to save request', 'error');
      }
    } else {
      saveDialog.open();
    }
  }, [activeTab, getValues, updateRequest, markTabAsSaved, showAlert, saveDialog]);

  useImperativeHandle(
    ref,
    () => ({
      sendCurrentRequest: handleSend,
      saveCurrentRequest: handleSave,
    }),
    [handleSend, handleSave],
  );

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeTab?.isDirty && !activeTab?.isLoading) {
          handleSave();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSend, handleSave, activeTab]);

  // Resize handling
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (panelLayout === 'horizontal') {
        const newWidth = e.clientX - rect.left;
        const clampedWidth = Math.max(300, Math.min(newWidth, rect.width - 300));
        setRequestPanelWidth(clampedWidth);
      } else {
        const newHeight = e.clientY - rect.top;
        const clampedHeight = Math.max(200, Math.min(newHeight, rect.height - 200));
        setRequestPanelHeight(clampedHeight);
      }
    };

    const handleMouseUp = () => setIsResizing(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, panelLayout, setRequestPanelWidth, setRequestPanelHeight]);

  // Cleanup abort controller
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleUrlChange = (newUrl: string) => {
    setValue('url', newUrl, { shouldDirty: true });
  };

  const handleHeadersChange = (newHeaders: RequestFormData['headers']) => {
    setValue('headers', newHeaders, { shouldDirty: true });
  };

  const handleParamsChange = (newParams: RequestFormData['params']) => {
    setValue('params', newParams, { shouldDirty: true });
  };

  const handleAuthChange = (newAuth: AuthConfig) => {
    setValue('auth', newAuth as RequestFormData['auth'], { shouldDirty: true });
  };

  const handleBodyTypeChange = (newBodyType: RequestFormData['bodyType']) => {
    setValue('bodyType', newBodyType, { shouldDirty: true });
  };

  const handleFormDataEntriesChange = (newEntries: FormDataEntry[]) => {
    setValue('formDataEntries', newEntries, { shouldDirty: true });
  };

  if (!activeTab) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
        <div className="text-center">
          <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Create or select a request to get started</p>
          <p className="text-sm mt-2">Press Ctrl+N to create a new tab</p>
        </div>
      </div>
    );
  }

  const isHorizontal = panelLayout === 'horizontal';

  return (
    <div ref={containerRef} className={`flex-1 flex ${isHorizontal ? 'flex-row' : 'flex-col'} min-h-0 overflow-hidden relative`}>
      {/* Request Panel */}
      <div
        className="flex flex-col overflow-hidden bg-white dark:bg-gray-900 relative"
        style={
          isHorizontal
            ? { width: requestPanelWidth }
            : { height: requestPanelHeight }
        }
      >
        {/* Breadcrumb + Save toolbar */}
        <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700 h-14 shrink-0">
          <RequestBreadcrumb savedRequestId={activeTab.savedRequestId} />
          <div className="flex items-center gap-2">
            {activeTab.isDirty && (
              <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3 h-3" />
                <span>Unsaved changes</span>
              </div>
            )}
            <Button onClick={handleSave} variant="secondary" size="sm" disabled={activeTab.isLoading || !activeTab.isDirty}>
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <RequestForm
            control={control}
            onSend={handleSend}
            loading={activeTab.isLoading}
            urlValue={urlValue}
            headers={headers}
            onHeadersChange={handleHeadersChange}
            params={params}
            onParamsChange={handleParamsChange}
            onUrlChange={handleUrlChange}
            auth={auth}
            onAuthChange={handleAuthChange}
            bodyType={bodyType}
            onBodyTypeChange={handleBodyTypeChange}
            formDataEntries={formDataEntries}
            onFormDataEntriesChange={handleFormDataEntriesChange}
          />
        </div>
      </div>

      {/* Resize Handle */}
      <div
        className={`${
          isHorizontal
            ? 'w-1 cursor-ew-resize hover:bg-orange-500'
            : 'h-1 cursor-ns-resize hover:bg-orange-500'
        } bg-gray-200 dark:bg-gray-700 transition-colors ${isResizing ? 'bg-orange-500' : ''}`}
        onMouseDown={handleResizeStart}
      />

      {/* Response Panel */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0">
        <ResponsePanel
          response={activeTab.response}
          loading={activeTab.isLoading}
          error={activeTab.error}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Save Dialog */}
      <Dialog isOpen={saveDialog.isOpen} onClose={saveDialog.close} title="Save Request">
        <SaveRequestForm
          currentRequest={{
            method: getValues('method'),
            url: buildUrlWithParams(getValues('url'), getValues('params')),
            headers: Object.fromEntries(
              getValues('headers')
                .filter(h => h.enabled && h.key.trim())
                .map(h => [h.key, h.value]),
            ),
            body: getValues('body') || undefined,
            bodyType: getValues('bodyType'),
            formDataEntries: getValues('formDataEntries'),
            auth: getValues('auth') as AuthConfig,
          }}
          onSuccess={saveDialog.close}
          onCancel={saveDialog.close}
        />
      </Dialog>
    </div>
  );
});

RequestResponseView.displayName = 'RequestResponseView';
