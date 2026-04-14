import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GitBranch } from 'lucide-react';
import { Button } from '../components/Button';
import { useWorkspaceStore } from '../store/workspace/store';
import { useAlertStore } from '../store/alert/store';
import { createWorkspaceSchema, type CreateWorkspaceFormData } from './schemas/workspaceSchemas';

interface CreateWorkspaceFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialCloneMode?: boolean;
}

export function CreateWorkspaceForm({ onSuccess, onCancel, initialCloneMode = false }: CreateWorkspaceFormProps) {
  const { createWorkspace, cloneWorkspace } = useWorkspaceStore();
  const { showAlert } = useAlertStore();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateWorkspaceFormData>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: {
      name: '',
      cloneFromRepo: initialCloneMode,
      repoUrl: '',
    },
  });

  const cloneFromRepo = watch('cloneFromRepo');

  const onSubmit = async (data: CreateWorkspaceFormData) => {
    try {
      if (data.cloneFromRepo && data.repoUrl) {
        await cloneWorkspace({ name: data.name, repoUrl: data.repoUrl.trim(), authToken: data.authToken?.trim() || undefined });
        showAlert('Success', 'Repository cloned and workspace created', 'success');
      } else {
        await createWorkspace({ name: data.name });
        showAlert('Success', 'Workspace created successfully', 'success');
      }
      reset();
      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create workspace';
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
        <label htmlFor="workspace-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Name <span className="text-red-500 dark:text-red-400">*</span>
        </label>
        <input
          id="workspace-name"
          type="text"
          {...register('name')}
          placeholder="My Workspace"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          autoFocus
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          id="clone-toggle"
          type="checkbox"
          {...register('cloneFromRepo')}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="clone-toggle" className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
          <GitBranch className="w-3.5 h-3.5" />
          Clone from Git repository
        </label>
      </div>

      {cloneFromRepo && (
        <>
        <div>
          <label htmlFor="repo-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Repository URL <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            id="repo-url"
            type="text"
            {...register('repoUrl')}
            placeholder="https://github.com/user/repo.git"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
          {errors.repoUrl && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.repoUrl.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="auth-token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Access Token <span className="text-xs text-gray-400 dark:text-gray-500">(optional)</span>
          </label>
          <input
            id="auth-token"
            type="password"
            {...register('authToken')}
            placeholder="For private repositories"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Personal access token or app password for authentication
          </p>
        </div>
        </>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" onClick={handleCancel} variant="ghost" size="md">
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="md" loading={isSubmitting} disabled={isSubmitting}>
          {cloneFromRepo ? 'Clone & Create' : 'Create Workspace'}
        </Button>
      </div>
    </form>
  );
}
