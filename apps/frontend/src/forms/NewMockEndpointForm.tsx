import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/Button';
import { MockModeToggle } from '../components/mock/MockModeToggle';
import { useMockStore } from '../store/mock/store';
import { useAlertStore } from '../store/alert/store';
import { newMockEndpointSchema, type NewMockEndpointFormData } from './schemas/mockSchemas';

interface NewMockEndpointFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewMockEndpointForm({ onSuccess, onCancel }: Readonly<NewMockEndpointFormProps>) {
  const { createEndpoint } = useMockStore();
  const { showAlert } = useAlertStore();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<NewMockEndpointFormData>({
    resolver: zodResolver(newMockEndpointSchema),
    defaultValues: {
      name: '',
      path: '',
      mode: 'static',
    },
  });
  const mode = watch('mode');

  const onSubmit = async (data: NewMockEndpointFormData) => {
    try {
      await createEndpoint({ name: data.name, path: data.path, mode: data.mode });
      reset();
      onSuccess();
    } catch {
      showAlert('Error', 'Failed to create endpoint', 'error');
    }
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mode</span>
        <div className="w-fit">
          <MockModeToggle mode={mode} onChange={next => setValue('mode', next)} />
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {mode === 'static'
            ? 'Static: You write the response for each HTTP method.'
            : 'Dynamic: Full CRUD routes backed by a dataset of records.'}
        </p>
      </div>

      <div>
        <label htmlFor="mock-endpoint-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Name <span className="text-red-500 dark:text-red-400">*</span>
        </label>
        <input
          id="mock-endpoint-name"
          type="text"
          {...register('name')}
          placeholder="Users API"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="mock-endpoint-path" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Path <span className="text-red-500 dark:text-red-400">*</span>
        </label>
        <input
          id="mock-endpoint-path"
          type="text"
          {...register('path')}
          placeholder="/api/users"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 font-mono"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          In dynamic mode, <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">/api/users/&#123;id&#125;</code> item routes are served automatically.
        </p>
        {errors.path && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.path.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" onClick={handleCancel} variant="ghost" size="md">
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="md" loading={isSubmitting} disabled={isSubmitting}>
          Create Endpoint
        </Button>
      </div>
    </form>
  );
}
