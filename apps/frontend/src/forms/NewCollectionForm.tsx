import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/Button';
import { useCollectionsStore } from '../store/collections/store';
import { useAlertStore } from '../store/alert/store';
import { newCollectionSchema, type NewCollectionFormData } from './schemas/collectionSchemas';

interface NewCollectionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewCollectionForm({ onSuccess, onCancel }: NewCollectionFormProps) {
  const { createCollection } = useCollectionsStore();
  const { showAlert } = useAlertStore();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<NewCollectionFormData>({
    resolver: zodResolver(newCollectionSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const onSubmit = async (data: NewCollectionFormData) => {
    try {
      await createCollection({ name: data.name, description: data.description || undefined });
      showAlert('Success', 'Collection created successfully', 'success');
      reset();
      onSuccess();
    } catch {
      showAlert('Error', 'Failed to create collection', 'error');
    }
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="collection-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Name <span className="text-red-500 dark:text-red-400">*</span>
        </label>
        <input
          id="collection-name"
          type="text"
          {...register('name')}
          placeholder="My API Collection"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          autoFocus
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="collection-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description (optional)
        </label>
        <textarea
          id="collection-description"
          {...register('description')}
          placeholder="Collection for testing user APIs"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" onClick={handleCancel} variant="ghost" size="md">
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="md" loading={isSubmitting} disabled={isSubmitting}>
          Create Collection
        </Button>
      </div>
    </form>
  );
}
