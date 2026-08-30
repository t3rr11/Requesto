import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FolderOpen, GitBranch, FileJson, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { Dialog } from './Dialog';
import { Button } from './Button';
import { useWorkspaceStore } from '../store/workspace/store';
import { useAlertStore } from '../store/alert/store';
import {
  addWorkspaceSchema,
  type AddWorkspaceFormInput,
  type AddWorkspaceFormData,
  type AddWorkspaceMode,
} from '../forms/schemas/workspaceSchemas';
import { API_BASE } from '../helpers/api/config';

export type { AddWorkspaceMode };

const MODES: { id: AddWorkspaceMode; label: string; description: string }[] = [
  { id: 'create', label: 'New', description: 'Start an empty workspace' },
  { id: 'open', label: 'Open Folder', description: 'Use a folder that already contains Requesto data' },
  { id: 'clone', label: 'Clone from Git', description: 'Clone a repository as a new workspace' },
  { id: 'import', label: 'Import File', description: 'Restore an exported workspace bundle (.json)' },
];

type InspectResult = {
  exists: boolean;
  isDirectory: boolean;
  hasRequestoData: boolean;
  isGitRepo: boolean;
  counts: { collections: number; environments: number; oauthConfigs: number };
  suggestedName: string;
};

const inputClassName =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500';

function basename(p: string): string {
  const normalized = p.replace(/[\\/]+$/, '');
  const idx = Math.max(normalized.lastIndexOf('\\'), normalized.lastIndexOf('/'));
  return idx >= 0 ? normalized.slice(idx + 1) : normalized;
}

interface AddWorkspaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AddWorkspaceMode;
}

export function AddWorkspaceDialog({ isOpen, onClose, initialMode }: AddWorkspaceDialogProps) {
  const { createWorkspace, cloneWorkspace, openWorkspace, importWorkspace, switchWorkspace } =
    useWorkspaceStore();
  const { showAlert } = useAlertStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<InspectResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewAbortRef = useRef<AbortController | null>(null);

  const isElectron = !!window.electronAPI;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddWorkspaceFormInput, unknown, AddWorkspaceFormData>({
    resolver: zodResolver(addWorkspaceSchema),
    defaultValues: { mode: initialMode ?? 'create', name: '', path: '', repoUrl: '', authToken: '' },
  });

  const mode = watch('mode');
  const pathValue = watch('path') ?? '';

  // Reset the form whenever the dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setPreview(null);
      setPreviewError(null);
      reset({ mode: initialMode ?? 'create', name: '', path: '', repoUrl: '', authToken: '' });
    }
  }, [isOpen, initialMode, reset]);

  // Debounced folder preview (Open Folder mode)
  useEffect(() => {
    if (mode !== 'open' || !pathValue.trim()) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    const trimmed = pathValue.trim();
    setPreviewLoading(true);
    const timer = setTimeout(async () => {
      previewAbortRef.current?.abort();
      const controller = new AbortController();
      previewAbortRef.current = controller;
      try {
        const res = await fetch(
          `${API_BASE}/workspaces/inspect?path=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Could not inspect the folder' }));
          throw new Error(err.error || 'Could not inspect the folder');
        }
        const result: InspectResult = await res.json();
        setPreview(result);
        setPreviewError(null);
        if (!watch('name')) {
          setValue('name', result.suggestedName);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setPreview(null);
        setPreviewError(error instanceof Error ? error.message : 'Could not inspect the folder');
      } finally {
        if (!controller.signal.aborted) setPreviewLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pathValue]);

  const handleBrowse = async () => {
    if (!window.electronAPI) return;
    const selected = await window.electronAPI.selectDirectory();
    if (selected) {
      setValue('path', selected);
      if (!watch('name')) {
        setValue('name', basename(selected));
      }
    }
  };

  const switchAndFinish = async (workspaceId: string, name: string) => {
    showAlert('Success', `Workspace "${name}" added`, 'success');
    try {
      await switchWorkspace(workspaceId);
    } catch {
      // Added but not switched — the user can switch manually
      reset();
      onClose();
      return;
    }
    reset();
    onClose();
    window.location.reload();
  };

  const onSubmit = async (data: AddWorkspaceFormData) => {
    try {
      if (data.mode === 'open' && data.path) {
        const workspace = await openWorkspace({ name: data.name, path: data.path });
        await switchAndFinish(workspace.id, workspace.name);
      } else if (data.mode === 'clone' && data.repoUrl) {
        const workspace = await cloneWorkspace({
          name: data.name,
          repoUrl: data.repoUrl,
          authToken: data.authToken?.trim() || undefined,
        });
        await switchAndFinish(workspace.id, workspace.name);
      } else if (data.mode === 'create') {
        const workspace = await createWorkspace({ name: data.name });
        await switchAndFinish(workspace.id, workspace.name);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add workspace';
      showAlert('Error', message, 'error');
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    try {
      const workspace = await importWorkspace(selectedFile);
      await switchAndFinish(workspace.id, workspace.name);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import workspace';
      showAlert('Error', message, 'error');
    }
  };

  const submitLabel =
    mode === 'open' ? 'Add Workspace' : mode === 'clone' ? 'Clone & Create' : 'Create Workspace';

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Add Workspace" size="md">
      <div className="grid grid-cols-2 gap-2 mb-5">
        {MODES.map(({ id, label, description }) => (
          <button
            key={id}
            type="button"
            onClick={() => setValue('mode', id)}
            data-testid={`workspace-mode-${id}`}
            className={`flex flex-col items-start gap-0.5 p-3 rounded-lg border text-left transition-colors ${
              mode === id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100">
              {id === 'create' && <Plus className="w-4 h-4" />}
              {id === 'open' && <FolderOpen className="w-4 h-4" />}
              {id === 'clone' && <GitBranch className="w-4 h-4" />}
              {id === 'import' && <FileJson className="w-4 h-4" />}
              {label}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{description}</span>
          </button>
        ))}
      </div>

      {mode === 'import' ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="workspace-import-file" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Workspace bundle <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              id="workspace-import-file"
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/40 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/60 cursor-pointer"
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Select a previously exported workspace JSON file.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={onClose} variant="ghost" size="md">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              variant="primary"
              size="md"
              loading={isSubmitting}
              disabled={!selectedFile || isSubmitting}
            >
              Import
            </Button>
          </div>
        </div>
      ) : (
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
              className={inputClassName}
              autoFocus
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
            )}
          </div>

          {mode === 'open' && (
            <>
              <div>
                <label htmlFor="workspace-path" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Folder <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="workspace-path"
                    type="text"
                    {...register('path')}
                    readOnly={isElectron}
                    value={pathValue}
                    placeholder={
                      isElectron ? 'Click Browse to select a folder' : 'Path on the machine running Requesto'
                    }
                    className={`flex-1 ${inputClassName} ${isElectron ? 'cursor-default' : ''}`}
                  />
                  {isElectron && (
                    <Button type="button" onClick={handleBrowse} variant="secondary" size="md">
                      Browse…
                    </Button>
                  )}
                </div>
                {errors.path && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.path.message}</p>
                )}
                {!isElectron && (
                  <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    <p className="mt-1">
                      Folder path as seen by the Requesto server. e.g.
                    </p>
                    <p>
                      {/* For Windows */}
                      <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-900 text-[11px]">C:\Users\User\projects\my-api</code> - Windows
                    </p>
                    <p>
                      {/* For Linux/macOS */}
                      <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-900 text-[11px]">/home/user/projects/my-api</code> - Linux/macOS
                    </p>
                    <p className="mt-1">
                      For Docker, mount the folder first, e.g.
                    </p>
                    <p>
                      <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-900 text-[11px]">-v ~/projects/my-api:/workspaces/my-api</code>
                    </p>
                  </div>
                )}
              </div>

              {(previewLoading || preview || previewError) && (
                <div
                  className={`flex items-start gap-2 p-3 rounded-lg text-sm border ${
                    previewError || (preview && !preview.exists && !preview.isDirectory)
                      ? 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                      : preview?.hasRequestoData
                        ? 'border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                  }`}
                  data-testid="workspace-folder-preview"
                >
                  {previewLoading ? (
                    <span className="text-gray-500 dark:text-gray-400">Checking folder…</span>
                  ) : previewError ? (
                    <>
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{previewError}</span>
                    </>
                  ) : preview && !preview.exists ? (
                    <>
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Directory not found — check the path, including whether it is mounted into the server.</span>
                    </>
                  ) : preview && !preview.isDirectory ? (
                    <>
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>That path is a file, not a folder.</span>
                    </>
                  ) : preview?.hasRequestoData ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        Requesto workspace found
                        {preview.isGitRepo ? ' (git repository)' : ''} — {preview.counts.collections}{' '}
                        {preview.counts.collections === 1 ? 'collection' : 'collections'},
                        {' '}{preview.counts.environments}{' '}
                        {preview.counts.environments === 1 ? 'environment' : 'environments'}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>No Requesto data here yet — a new workspace will be created in this folder.</span>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {mode === 'clone' && (
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
                  className={inputClassName}
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
                  className={inputClassName}
                  autoComplete="off"
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Personal access token or app password for authentication
                </p>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={onClose} variant="ghost" size="md">
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" loading={isSubmitting} disabled={isSubmitting}>
              {submitLabel}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
