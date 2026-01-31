import { forwardRef, useImperativeHandle, useEffect, useState, useMemo } from 'react';
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

export interface RequestResponseViewRef {
  loadRequest: (item: { method: string; url: string; headers?: Record<string, string>; body?: string }) => void;
  getCurrentRequest: () => { method: string; url: string; headers?: Record<string, string>; body?: string } | null;
  setSavedRequestId: (id: string | undefined) => void;
}

const RequestResponseView = forwardRef<RequestResponseViewRef, {}>(function RequestResponseView(_, ref) {
  const { setLoading, setResponse, setError, setCurrentSavedRequestId, currentRequestData, addConsoleLog, response, loading, error } = useRequestStore();
  const { collections, updateRequest: updateCollectionRequest } = useCollectionsStore();
  const { showAlert } = useAlertStore();
  const [initialFormState, setInitialFormState] = useState<string | null>(null);
  
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

  // Check if form has changes compared to initial state
  const hasChanges = useMemo(() => {
    if (!savedRequestId || !initialFormState) return false;
    const currentState = JSON.stringify({
      method: formValues.method,
      url: formValues.url,
      headers: formValues.headers,
      body: formValues.body,
      savedRequestId: formValues.savedRequestId,
    });
    return currentState !== initialFormState;
  }, [formValues, savedRequestId, initialFormState]);

  // Load request from store when currentRequestData changes
  useEffect(() => {
    if (currentRequestData) {
      const loadedHeaders = currentRequestData.headers && Object.keys(currentRequestData.headers).length > 0
        ? Object.entries(currentRequestData.headers).map(([key, value], index) => ({
            id: Date.now().toString() + index,
            key,
            value,
            enabled: true,
          }))
        : [{ id: Date.now().toString(), key: '', value: '', enabled: true }];

      const formData = {
        method: currentRequestData.method,
        url: currentRequestData.url,
        headers: loadedHeaders,
        body: currentRequestData.body || '',
        savedRequestId: currentRequestData.savedRequestId,
      };

      reset(formData);
      setInitialFormState(JSON.stringify(formData));
    }
  }, [currentRequestData, reset]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to send request
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const currentUrl = getValues('url');
        if (!loading && currentUrl.trim()) {
          handleSend();
        }
      }
      // Ctrl/Cmd + S to save request
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const currentSavedRequestId = getValues('savedRequestId');
        if (currentSavedRequestId && hasChanges && !loading) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, getValues, hasChanges]);

  const handleSend = async () => {
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

    setCurrentSavedRequestId(undefined);
    setValue('savedRequestId', undefined);

    setLoading(true);
    setError(null);

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

      setResponse(response);
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
      setError(error.message || 'Failed to send request');
      addConsoleLog({
        id: (Date.now() + 1).toString(),
        timestamp: Date.now(),
        type: 'error',
        message: error.message || 'Failed to send request',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const values = getValues();
    if (!values.url.trim() || !values.savedRequestId) return;

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

    const collection = collections.find(c => 
      c.requests.some(r => r.id === values.savedRequestId)
    );

    if (!collection) {
      showAlert('Collection Not Found', 'Could not find the collection for this request.', 'error');
      return;
    }

    try {
      await updateCollectionRequest(collection.id, values.savedRequestId!, {
        method: requestData.method,
        url: requestData.url,
        headers: requestData.headers,
        body: requestData.body,
      });
      
      // Update initial state to match current form state (disables save button)
      setInitialFormState(JSON.stringify({
        method: values.method,
        url: values.url,
        headers: values.headers,
        body: values.body,
        savedRequestId: values.savedRequestId,
      }));
    } catch (error) {
      showAlert('Update Failed', 'Failed to update the request. Please try again.', 'error');
      console.error('Failed to update request:', error);
    }
  };

  useImperativeHandle(ref, () => ({
    loadRequest: (item: { method: string; url: string; headers?: Record<string, string>; body?: string }) => {
      const loadedHeaders = item.headers && Object.keys(item.headers).length > 0
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
      setInitialFormState(JSON.stringify(formData));
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
      const values = getValues();
      setInitialFormState(JSON.stringify({
        method: values.method,
        url: values.url,
        headers: values.headers,
        body: values.body,
        savedRequestId: id,
      }));
    },
  }), [getValues, reset, setValue]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Top Bar - Breadcrumb and Save */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between h-14">
        <RequestBreadcrumb savedRequestId={savedRequestId} />
        {savedRequestId && (
          <Button onClick={handleSave} size="sm" disabled={loading || !hasChanges}>
            Save
          </Button>
        )}
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        <RequestForm
          control={control}
          onSend={handleSend}
          loading={loading}
          urlValue={formValues.url}
          headers={formValues.headers}
          onHeadersChange={(headers) => setValue('headers', headers)}
        />
        <ResponsePanel response={response} loading={loading} error={error} />
      </div>
    </div>
  );
});

RequestResponseView.displayName = 'RequestResponseView';

export default RequestResponseView;
