import { useState, useRef } from 'react';
import { Download, GitBranch, Pencil, Trash2, Upload } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspace/store';
import { useAlertStore } from '../store/alert/store';
import { Dialog, DialogFooter } from './Dialog';
import { Button } from './Button';
import { CreateWorkspaceForm } from '../forms/CreateWorkspaceForm';
import { useConfirmDialog, useDialogWithData } from '../hooks/useDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { RenameForm } from '../forms/RenameForm';
import type { Workspace } from '../store/workspace/types';

interface WorkspaceManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WorkspaceManagerDialog({ isOpen, onClose }: WorkspaceManagerDialogProps) {
  const { registry, deleteWorkspace, updateWorkspace, switchWorkspace, exportWorkspace, importWorkspace } =
    useWorkspaceStore();
  const { showAlert } = useAlertStore();
  const confirmDialog = useConfirmDialog();
  const renameDialog = useDialogWithData<Workspace>();
  const [createMode, setCreateMode] = useState<'empty' | 'clone' | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleDelete = (workspace: Workspace) => {
    if (registry.workspaces.length <= 1) {
      showAlert('Cannot Delete', 'You must have at least one workspace.', 'error');
      return;
    }

    confirmDialog.open({
      title: 'Delete Workspace',
      message: `Are you sure you want to delete "${workspace.name}"? All workspace data will be permanently removed. This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteWorkspace(workspace.id);
          showAlert('Success', `Workspace "${workspace.name}" deleted.`, 'success');
          if (workspace.id === registry.activeWorkspaceId) {
            window.location.reload();
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete workspace';
          showAlert('Error', message, 'error');
        }
      },
    });
  };

  const handleStartRename = (workspace: Workspace) => {
    renameDialog.open(workspace);
  };

  const handleSaveRename = async (newName: string) => {
    if (!renameDialog.data) return;
    try {
      await updateWorkspace(renameDialog.data.id, { name: newName });
      renameDialog.close();
    } catch {
      showAlert('Error', 'Failed to rename workspace', 'error');
    }
  };

  const handleSwitch = async (id: string) => {
    if (id === registry.activeWorkspaceId) return;
    try {
      await switchWorkspace(id);
      onClose();
      window.location.reload();
    } catch {
      showAlert('Error', 'Failed to switch workspace', 'error');
    }
  };

  const handleExport = async (workspace: Workspace) => {
    try {
      await exportWorkspace(workspace.id);
      showAlert('Success', `Workspace "${workspace.name}" exported.`, 'success');
    } catch {
      showAlert('Error', 'Failed to export workspace', 'error');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importWorkspace(file);
      showAlert('Success', 'Workspace imported successfully.', 'success');
    } catch {
      showAlert('Error', 'Failed to import workspace. Make sure the file is valid.', 'error');
    }
    if (importInputRef.current) importInputRef.current.value = '';
  };

  const handleCreateSuccess = () => {
    setCreateMode(null);
  };

  if (createMode !== null) {
    return (
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title={createMode === 'clone' ? 'Clone from Git' : 'New Workspace'}
        size="md"
      >
        <CreateWorkspaceForm
          onSuccess={handleCreateSuccess}
          onCancel={() => setCreateMode(null)}
          initialCloneMode={createMode === 'clone'}
        />
      </Dialog>
    );
  }

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title="Manage Workspaces"
        size="lg"
        footer={
          <DialogFooter>
            <div className="flex gap-2">
              <input ref={importInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
              <Button variant="secondary" size="md" onClick={() => importInputRef.current?.click()}>
                <Upload className="w-4 h-4" />
                Import
              </Button>
              <Button variant="secondary" size="md" onClick={() => setCreateMode('clone')}>
                <GitBranch className="w-4 h-4" />
                Clone from Git
              </Button>
              <Button variant="primary" size="md" onClick={() => setCreateMode('empty')}>
                New Workspace
              </Button>
            </div>
          </DialogFooter>
        }
      >
        <div className="space-y-1">
          {registry.workspaces.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No workspaces yet. Create one to get started.
            </p>
          ) : (
            registry.workspaces.map(workspace => (
              <button
                key={workspace.id}
                onClick={() => handleSwitch(workspace.id)}
                className="flex items-center w-full gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group"
              >
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {workspace.name}
                    </span>
                    {workspace.isGitRepo && (
                      <span title="Git repository">
                        <GitBranch className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
                      </span>
                    )}
                    {workspace.id === registry.activeWorkspaceId && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full shrink-0">
                        Active
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button
                    variant="icon"
                    size="sm"
                    title="Export"
                    onClick={e => {
                      e.stopPropagation();
                      handleExport(workspace);
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="icon"
                    size="sm"
                    title="Rename"
                    onClick={e => {
                      e.stopPropagation();
                      handleStartRename(workspace);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="icon"
                    size="sm"
                    title="Delete"
                    onClick={e => {
                      e.stopPropagation();
                      handleDelete(workspace);
                    }}
                    disabled={registry.workspaces.length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </button>
            ))
          )}
        </div>
      </Dialog>
      <ConfirmDialog {...confirmDialog.props} />
      <RenameForm
        isOpen={renameDialog.isOpen}
        onClose={renameDialog.close}
        onSave={handleSaveRename}
        currentName={renameDialog.data?.name ?? ''}
        title="Rename Workspace"
        label="Workspace Name"
      />
    </>
  );
}
