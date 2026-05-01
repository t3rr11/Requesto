import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/Button';
import { useCollectionsStore } from '../store/collections/store';
import { useUIStore } from '../store/ui/store';
import { useAlertStore } from '../store/alert/store';
import { newFolderSchema, type NewFolderFormData } from './schemas/folderSchemas';

interface NewFolderFormProps {
  collectionId: string;
  parentId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewFolderForm({ collectionId, parentId, onSuccess, onCancel }: NewFolderFormProps) {
  const { addFolder } = useCollectionsStore();
  const { expandFolder, expandCollection } = useUIStore();
  const { showAlert } = useAlertStore();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<NewFolderFormData>({
    resolver: zodResolver(newFolderSchema),
    defaultValues: { name: '' },
  });

  const onSubmit = async (data: NewFolderFormData) => {
    try {
      await addFolder(collectionId, data.name, parentId);
      if (parentId) {
        expandFolder(parentId);
      } else {
        expandCollection(collectionId);
      }
      showAlert('Success', 'Folder created successfully', 'success');
      reset();
      onSuccess();
    } catch {
      showAlert('Error', 'Failed to create folder', 'error');
    }
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="folder-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Name <span className="text-red-500 dark:text-red-400">*</span>
        </label>
        <input
          id="folder-name"
          type="text"
          {...register('name')}
          placeholder="My Folder"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          autoFocus
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" onClick={handleCancel} variant="ghost" size="md">
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="md" loading={isSubmitting} disabled={isSubmitting}>
          Create Folder
        </Button>
      </div>
    </form>
  );
}
