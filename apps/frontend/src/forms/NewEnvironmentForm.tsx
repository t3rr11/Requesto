import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/Button';
import { useEnvironmentStore } from '../store/environments/store';
import { useAlertStore } from '../store/alert/store';
import { createNewEnvironment } from '../helpers/environment';
import { newEnvironmentSchema, type NewEnvironmentFormData } from './schemas/environmentSchemas';

interface NewEnvironmentFormProps {
  onSuccess: (id: string) => void;
  onCancel: () => void;
}

export function NewEnvironmentForm({ onSuccess, onCancel }: NewEnvironmentFormProps) {
  const { addEnvironment, saveEnvironment } = useEnvironmentStore();
  const { showAlert } = useAlertStore();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<NewEnvironmentFormData>({
    resolver: zodResolver(newEnvironmentSchema),
    defaultValues: { name: '' },
  });

  const onSubmit = async (data: NewEnvironmentFormData) => {
    const newEnv = createNewEnvironment(data.name);
    try {
      addEnvironment(newEnv);
      await saveEnvironment(newEnv);
      showAlert('Success', 'Environment created', 'success');
      reset();
      onSuccess(newEnv.id);
    } catch {
      showAlert('Error', 'Failed to create environment', 'error');
    }
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="environment-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Name <span className="text-red-500 dark:text-red-400">*</span>
        </label>
        <input
          id="environment-name"
          type="text"
          {...register('name')}
          placeholder="Production"
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
          Create
        </Button>
      </div>
    </form>
  );
}
