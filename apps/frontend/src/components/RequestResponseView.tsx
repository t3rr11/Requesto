import { useRef, useEffect, useCallback } from 'react';
import { Save, Play, AlertTriangle } from 'lucide-react';
import { useTabsStore } from '../store/tabs/store';
import { useCollectionsStore } from '../store/collections/store';
import { useEnvironmentStore } from '../store/environments/store';
import { useRequestStore } from '../store/request/store';
import { useUIStore } from '../store/ui/store';
import { useAlertStore } from '../store/alert/store';
import { useThemeStore } from '../store/theme/store';
import { RequestForm } from '../forms/RequestForm';
import type { RequestFormData } from '../forms/RequestForm';
import { ResponsePanel } from './ResponsePanel';
import { RequestBreadcrumb } from './RequestBreadcrumb';
import { SaveRequestForm } from '../forms/SaveRequestForm';
import { Dialog } from './Dialog';
import { Button } from './Button';
import { useDialog } from '../hooks/useDialog';
import { useResizablePanel } from '../hooks/useResizablePanel';
import { buildRequestFromFormData } from '../helpers/request';
import { substituteInRequest, getUndefinedVariables } from '../helpers/environment';
import type { StreamingResponse } from '../store/request/types';

export function RequestResponseView() {
  const { getActiveTab, setTabResponse, setTabLoading, setTabError, markTabAsSaved } = useTabsStore();
  const { updateRequest } = useCollectionsStore();
  const { environmentsData } = useEnvironmentStore();
  const { sendRequest, sendStreamingRequest, isStreamingRequest, addConsoleLog } = useRequestStore();
  const { panelLayout, requestPanelWidth, requestPanelHeight, setRequestPanelWidth, setRequestPanelHeight } = useUIStore();
  const { showAlert } = useAlertStore();
  const { isDarkMode } = useThemeStore();

  const activeTab = getActiveTab();
  const containerRef = useRef<HTMLDivElement>(null);
  const formDataRef = useRef<RequestFormData | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const saveDialog = useDialog();

  const isHorizontal = panelLayout === 'horizontal';
  const { isResizing, handleResizeStart } = useResizablePanel({
    containerRef,
    axis: isHorizontal ? 'horizontal' : 'vertical',
    onResize: isHorizontal ? setRequestPanelWidth : setRequestPanelHeight,
    min: isHorizontal ? 300 : 200,
    max: (containerSize) => containerSize - (isHorizontal ? 300 : 200),
  });

  // Abort any in-flight request on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleSend = useCallback(async (formData: RequestFormData) => {
    const tab = getActiveTab();
    if (!tab) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const rawRequest = buildRequestFromFormData(formData);

    const activeEnv = environmentsData.environments.find(
      e => e.id === environmentsData.activeEnvironmentId,
    );
    const request = activeEnv ? substituteInRequest(rawRequest, activeEnv) : rawRequest;

    if (activeEnv) {
      const undefinedVars = getUndefinedVariables(rawRequest, activeEnv);
      if (undefinedVars.length > 0) {
        showAlert('Warning', `Undefined variables: ${undefinedVars.join(', ')}`, 'warning');
      }
    }

    const requestId = crypto.randomUUID();

    addConsoleLog({
      id: `req-${Date.now()}`,
      requestId,
      timestamp: Date.now(),
      type: 'request',
      method: request.method,
      url: request.url,
      requestData: request,
    });

    setTabLoading(tab.id, true);
    setTabError(tab.id, null);

    try {
      if (isStreamingRequest(request)) {
        const streamResponse = await sendStreamingRequest(
          request,
          (partial: StreamingResponse) => setTabResponse(tab.id, partial),
          controller.signal,
        );
        setTabResponse(tab.id, streamResponse);
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
        const response = await sendRequest(request, controller.signal);
        setTabResponse(tab.id, response);
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
      if (err instanceof DOMException && err.name === 'AbortError') {
        addConsoleLog({
          id: `cancel-${Date.now()}`,
          requestId,
          timestamp: Date.now(),
          type: 'error',
          method: request.method,
          url: request.url,
          message: 'Request cancelled',
        });
      } else {
        const errorMsg = err instanceof Error ? err.message : 'Request failed';
        setTabError(tab.id, errorMsg);
        addConsoleLog({
          id: `err-${Date.now()}`,
          requestId,
          timestamp: Date.now(),
          type: 'error',
          method: request.method,
          url: request.url,
          message: errorMsg,
        });
      }
    } finally {
      abortControllerRef.current = null;
      setTabLoading(tab.id, false);
    }
  }, [
    getActiveTab,
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

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const handleSave = useCallback(async () => {
    if (!activeTab || !formDataRef.current) return;

    if (activeTab.savedRequestId && activeTab.collectionId) {
      try {
        await updateRequest(
          activeTab.collectionId,
          activeTab.savedRequestId,
          buildRequestFromFormData(formDataRef.current),
        );
        markTabAsSaved(activeTab.id, activeTab.savedRequestId, activeTab.collectionId);
      } catch {
        showAlert('Failed to save request', 'error');
      }
    } else {
      saveDialog.open();
    }
  }, [activeTab, updateRequest, markTabAsSaved, showAlert, saveDialog]);

  const handleFormChange = useCallback((formData: RequestFormData) => {
    formDataRef.current = formData;
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeTab?.isDirty && !activeTab?.isLoading) {
          handleSave();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, activeTab]);

  if (!activeTab) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
        <div className="text-center">
          <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Create or select a request to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex ${isHorizontal ? 'flex-row' : 'flex-col'} min-h-0 overflow-hidden relative`}
    >
      {/* Request Panel */}
      <div
        className="flex flex-col overflow-hidden bg-white dark:bg-gray-900 relative"
        style={isHorizontal ? { width: requestPanelWidth } : { height: requestPanelHeight }}
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
            <Button
              onClick={handleSave}
              variant="secondary"
              size="sm"
              disabled={activeTab.isLoading || !activeTab.isDirty}
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <RequestForm
            onSend={handleSend}
            onCancel={handleCancel}
            onChange={handleFormChange}
            loading={activeTab.isLoading}
          />
        </div>
      </div>

      {/* Resize Handle */}
      <div
        className={`${
          isHorizontal ? 'w-1 cursor-ew-resize hover:bg-orange-500' : 'h-1 cursor-ns-resize hover:bg-orange-500'
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
          currentRequest={formDataRef.current ? buildRequestFromFormData(formDataRef.current) : null}
          onSuccess={saveDialog.close}
          onCancel={saveDialog.close}
        />
      </Dialog>
    </div>
  );
}