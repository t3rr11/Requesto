import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link2 } from 'lucide-react';
import { Button } from '../components/Button';
import { useCollectionsStore } from '../store/collections/store';
import { useAlertStore } from '../store/alert/store';
import { importOpenApiSchema, type ImportOpenApiFormData } from './schemas/openApiSchemas';

interface ImportOpenApiFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function ImportOpenApiForm({ onSuccess, onCancel }: ImportOpenApiFormProps) {
  const { importOpenApiCollection } = useCollectionsStore();
  const { showAlert } = useAlertStore();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ImportOpenApiFormData>({
    resolver: zodResolver(importOpenApiSchema),
    defaultValues: {
      source: '',
      name: '',
      linkSpec: true,
    },
  });

  const linkSpec = watch('linkSpec');

  const onSubmit = async (data: ImportOpenApiFormData) => {
    try {
      const collection = await importOpenApiCollection({
        source: data.source.trim(),
        name: data.name?.trim() || undefined,
        linkSpec: data.linkSpec,
      });
      showAlert('Success', `Imported "${collection.name}" with ${collection.requests.length} requests`, 'success');
      reset();
      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import OpenAPI spec';
      showAlert('Error', message, 'error');
    }
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="openapi-source" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Spec Source <span className="text-red-500 dark:text-red-400">*</span>
        </label>
        <input
          id="openapi-source"
          type="text"
          {...register('source')}
          placeholder="https://petstore3.swagger.io/api/v3/openapi.json"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          autoFocus
        />
        {errors.source && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.source.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          URL or file path to an OpenAPI 3.x / Swagger 2.0 spec (JSON or YAML)
        </p>
      </div>

      <div>
        <label htmlFor="openapi-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Collection Name <span className="text-xs text-gray-400 dark:text-gray-500">(optional)</span>
        </label>
        <input
          id="openapi-name"
          type="text"
          {...register('name')}
          placeholder="Defaults to spec title"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="link-spec-toggle"
          type="checkbox"
          {...register('linkSpec')}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="link-spec-toggle" className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
          <Link2 className="w-3.5 h-3.5" />
          Keep linked for future syncing
        </label>
      </div>

      {linkSpec && (
        <p className="text-xs text-gray-400 dark:text-gray-500 ml-6">
          The collection will stay connected to this spec. You can pull updates later.
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" onClick={handleCancel} variant="ghost" size="md">
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="md" loading={isSubmitting} disabled={isSubmitting}>
          Import
        </Button>
      </div>
    </form>
  );
}
