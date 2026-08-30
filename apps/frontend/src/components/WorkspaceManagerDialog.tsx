import { Download, GitBranch, Pencil, Trash2, Plus } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspace/store';
import { useAlertStore } from '../store/alert/store';
import { Dialog, DialogFooter } from './Dialog';
import { Button } from './Button';
import { useConfirmDialog, useDialogWithData } from '../hooks/useDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { RenameForm } from '../forms/RenameForm';
import type { AddWorkspaceMode } from './AddWorkspaceDialog';
import type { Workspace } from '../store/workspace/types';

interface WorkspaceManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWorkspace: (mode?: AddWorkspaceMode) => void;
}

export function WorkspaceManagerDialog({ isOpen, onClose, onAddWorkspace }: WorkspaceManagerDialogProps) {
  const { registry, deleteWorkspace, updateWorkspace, switchWorkspace, exportWorkspace } =
    useWorkspaceStore();
  const { showAlert } = useAlertStore();
  const confirmDialog = useConfirmDialog();
  const renameDialog = useDialogWithData<Workspace>();

  const handleDelete = (workspace: Workspace) => {
    if (registry.workspaces.length <= 1) {
      showAlert('Cannot Delete', 'You must have at least one workspace.', 'error');
      return;
    }

    confirmDialog.open({
      title: 'Remove Workspace',
      message: `Are you sure you want to remove "${workspace.name}" from your workspace list? Its folder and files are kept on disk and it can be re-added later.`,
      confirmText: 'Remove',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteWorkspace(workspace.id);
          showAlert('Success', `Workspace "${workspace.name}" removed from your list.`, 'success');
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

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title="Manage Workspaces"
        size="lg"
        footer={
          <DialogFooter>
            <Button variant="primary" size="md" onClick={() => onAddWorkspace()}>
              <Plus className="w-4 h-4" />
              Add Workspace
            </Button>
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
              <div
                key={workspace.id}
                className="flex items-center w-full gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group"
              >
                <button
                  type="button"
                  onClick={() => handleSwitch(workspace.id)}
                  className="flex-1 text-left min-w-0"
                >
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
                </button>
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
              </div>
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
