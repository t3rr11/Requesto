import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GitBranch, FolderOpen } from 'lucide-react';
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
  const { createWorkspace, cloneWorkspace, openWorkspace } = useWorkspaceStore();
  const { showAlert } = useAlertStore();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateWorkspaceFormData>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: {
      name: '',
      cloneFromRepo: initialCloneMode,
      repoUrl: '',
      openExisting: false,
      existingPath: '',
    },
  });

  const cloneFromRepo = watch('cloneFromRepo');
  const openExisting = watch('openExisting');
  const existingPath = watch('existingPath');

  const isElectron = !!window.electronAPI;

  const handleCloneToggle = (checked: boolean) => {
    if (checked) setValue('openExisting', false);
  };

  const handleOpenExistingToggle = (checked: boolean) => {
    if (checked) setValue('cloneFromRepo', false);
  };

  const handleBrowse = async () => {
    if (!window.electronAPI) return;
    const selected = await window.electronAPI.selectDirectory();
    if (selected) {
      setValue('existingPath', selected);
    }
  };

  const onSubmit = async (data: CreateWorkspaceFormData) => {
    try {
      if (data.openExisting && data.existingPath) {
        await openWorkspace({ name: data.name, path: data.existingPath.trim() });
        showAlert('Success', 'Workspace added successfully', 'success');
      } else if (data.cloneFromRepo && data.repoUrl) {
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
          {...register('cloneFromRepo', {
            onChange: (e) => handleCloneToggle(e.target.checked),
          })}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="clone-toggle" className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
          <GitBranch className="w-3.5 h-3.5" />
          Clone from Git repository
        </label>
      </div>

      {isElectron && (
        <div className="flex items-center gap-2">
          <input
            id="open-existing-toggle"
            type="checkbox"
            {...register('openExisting', {
              onChange: (e) => handleOpenExistingToggle(e.target.checked),
            })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="open-existing-toggle" className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
            <FolderOpen className="w-3.5 h-3.5" />
            Open existing directory
          </label>
        </div>
      )}

      {openExisting && (
        <div>
          <label htmlFor="existing-path" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Directory <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <div className="flex gap-2">
            <input
              id="existing-path"
              type="text"
              {...register('existingPath')}
              readOnly
              value={existingPath}
              placeholder="Click Browse to select a folder"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 cursor-default"
            />
            <Button type="button" onClick={handleBrowse} variant="secondary" size="md">
              Browse…
            </Button>
          </div>
          {errors.existingPath && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.existingPath.message}</p>
          )}
        </div>
      )}

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
          {openExisting ? 'Add Workspace' : cloneFromRepo ? 'Clone & Create' : 'Create Workspace'}
        </Button>
      </div>
    </form>
  );
}
