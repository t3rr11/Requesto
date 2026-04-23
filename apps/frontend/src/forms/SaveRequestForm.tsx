import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/Button';
import { useCollectionsStore } from '../store/collections/store';
import { UNCATEGORIZED_COLLECTION_ID, UNCATEGORIZED_COLLECTION_NAME } from '../store/collections/constants';
import { useTabsStore } from '../store/tabs/store';
import { useAlertStore } from '../store/alert/store';
import type { AuthConfig, BodyType, FormDataEntry } from '../store/request/types';
import { extractPathnameFromUrl } from '../helpers/url';
import { saveRequestSchema, type SaveRequestFormData } from './schemas/requestSchemas';

interface SaveRequestFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  currentRequest: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
    bodyType?: BodyType;
    formDataEntries?: FormDataEntry[];
    auth?: AuthConfig;
  } | null;
}

export function SaveRequestForm({ onSuccess, onCancel, currentRequest }: SaveRequestFormProps) {
  const { collections, saveRequest, setActiveRequest } = useCollectionsStore();
  const { showAlert } = useAlertStore();
  const { markTabAsSaved, updateTabLabel, activeTabId } = useTabsStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    reset,
  } = useForm<SaveRequestFormData>({
    resolver: zodResolver(saveRequestSchema),
    defaultValues: {
      name: '',
      collectionId: collections.length > 0 ? collections[0].id : UNCATEGORIZED_COLLECTION_ID,
    },
  });

  useEffect(() => {
    if (currentRequest) {
      const pathname = extractPathnameFromUrl(currentRequest.url);
      setValue('name', `${currentRequest.method} ${pathname}`);
    }
  }, [currentRequest, setValue]);

  useEffect(() => {
    setValue('collectionId', collections.length > 0 ? collections[0].id : UNCATEGORIZED_COLLECTION_ID);
  }, [collections, setValue]);

  const onSubmit = async (data: SaveRequestFormData) => {
    if (!currentRequest) {
      showAlert('Error', 'No request to save', 'error');
      return;
    }

    if (!currentRequest.url.trim()) {
      showAlert('Error', 'Request URL is required', 'error');
      return;
    }

    try {
      const savedRequestResult = await saveRequest(data.collectionId, {
        name: data.name,
        method: currentRequest.method,
        url: currentRequest.url,
        headers: currentRequest.headers,
        body: currentRequest.body,
        bodyType: currentRequest.bodyType,
        formDataEntries: currentRequest.formDataEntries,
        auth: currentRequest.auth,
      });

      setActiveRequest(savedRequestResult.id);

      if (activeTabId) {
        markTabAsSaved(activeTabId, savedRequestResult.id, data.collectionId);
        updateTabLabel(activeTabId, data.name);
      }

      showAlert('Success', 'Request saved successfully', 'success');
      reset();
      onSuccess();
    } catch {
      showAlert('Error', 'Failed to save request', 'error');
    }
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="request-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Request Name <span className="text-red-500 dark:text-red-400">*</span>
        </label>
        <input
          id="request-name"
          type="text"
          {...register('name')}
          placeholder="Get User by ID"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          autoFocus
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="collection-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Collection <span className="text-red-500 dark:text-red-400">*</span>
        </label>
        <select
          id="collection-select"
          {...register('collectionId')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          {collections.map(col => (
            <option key={col.id} value={col.id}>{col.name}</option>
          ))}
          {/* Fallback option for the system Uncategorized collection — only render it when the */}
          {/* backend hasn't materialised it yet, otherwise it would appear twice in the dropdown. */}
          {!collections.some(col => col.id === UNCATEGORIZED_COLLECTION_ID) && (
            <option value={UNCATEGORIZED_COLLECTION_ID}>{UNCATEGORIZED_COLLECTION_NAME}</option>
          )}
        </select>
        {errors.collectionId && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.collectionId.message}</p>
        )}
      </div>

      {currentRequest && (
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md text-sm">
          <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Request Preview:</div>
          <div className="space-y-1 text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-semibold">{currentRequest.method}</span>{' '}
              {currentRequest.url || <span className="text-red-500 dark:text-red-400">No URL specified</span>}
            </div>
            {currentRequest.headers && Object.keys(currentRequest.headers).length > 0 && (
              <div className="text-xs">
                {Object.keys(currentRequest.headers).length} header(s)
              </div>
            )}
            {currentRequest.body && (
              <div className="text-xs">Body: {currentRequest.body.substring(0, 50)}...</div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" onClick={handleCancel} variant="ghost" size="md">
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={isSubmitting}
          disabled={isSubmitting || !currentRequest?.url?.trim()}
        >
          Save Request
        </Button>
      </div>
    </form>
  );
}
