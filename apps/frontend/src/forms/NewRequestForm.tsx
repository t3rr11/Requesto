import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/Button';
import { useCollectionsStore } from '../store/collections/store';
import { useAlertStore } from '../store/alert/store';
import { newRequestSchema, type NewRequestFormData } from './schemas/requestSchemas';

interface NewRequestFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  preselectedCollectionId?: string;
  preselectedFolderId?: string;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;

export function NewRequestForm({
  onSuccess,
  onCancel,
  preselectedCollectionId,
  preselectedFolderId,
}: NewRequestFormProps) {
  const { collections, createRequest } = useCollectionsStore();
  const { showAlert } = useAlertStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    reset,
  } = useForm<NewRequestFormData>({
    resolver: zodResolver(newRequestSchema),
    defaultValues: {
      name: '',
      method: 'GET',
      collectionId: preselectedCollectionId || (collections.length > 0 ? collections[0].id : ''),
      folderId: preselectedFolderId || '',
    },
  });

  const collectionId = watch('collectionId');
  const selectedCollection = collections.find(c => c.id === collectionId);
  const availableFolders = selectedCollection?.folders || [];

  useEffect(() => {
    if (preselectedCollectionId) {
      setValue('collectionId', preselectedCollectionId);
    } else if (collections.length > 0 && !collectionId) {
      setValue('collectionId', collections[0].id);
    }

    if (preselectedFolderId) {
      setValue('folderId', preselectedFolderId);
    }
  }, [preselectedCollectionId, preselectedFolderId, collections, collectionId, setValue]);

  const onSubmit = async (data: NewRequestFormData) => {
    try {
      await createRequest(data.collectionId, {
        name: data.name,
        method: data.method,
        url: 'http://localhost:3000',
        headers: {},
        body: '',
        folderId: data.folderId || undefined,
      });
      showAlert('Success', 'Request created successfully', 'success');
      reset();
      onSuccess();
    } catch {
      showAlert('Error', 'Failed to create request', 'error');
    }
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {collections.length === 0 ? (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-400 px-3 py-2 rounded text-sm">
          No collections available. Please create a collection first.
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="request-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Request Name <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              id="request-name"
              type="text"
              {...register('name')}
              placeholder="My Request"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              autoFocus
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="request-method" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              HTTP Method <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <select
              id="request-method"
              {...register('method')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              {HTTP_METHODS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="request-collection" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Collection <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <select
              id="request-collection"
              {...register('collectionId', {
                onChange: () => setValue('folderId', ''),
              })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              {collections.map(collection => (
                <option key={collection.id} value={collection.id}>{collection.name}</option>
              ))}
            </select>
          </div>

          {availableFolders.length > 0 && (
            <div>
              <label htmlFor="request-folder" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Folder (optional)
              </label>
              <select
                id="request-folder"
                {...register('folderId')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">-- Root Level --</option>
                {availableFolders.map(folder => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-400 px-3 py-2 rounded text-sm">
            A new empty request will be created with a default URL that you can edit.
          </div>
        </>
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
          disabled={isSubmitting || collections.length === 0}
        >
          Create Request
        </Button>
      </div>
    </form>
  );
}
