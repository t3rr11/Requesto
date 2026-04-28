import { useState } from 'react';
import { Upload, Plus, Zap, Globe, Check, Copy, Download, Pencil, Trash2 } from 'lucide-react';
import type { Environment } from '../store/environments/types';
import { useEnvironmentStore } from '../store/environments/store';
import { useAlertStore } from '../store/alert/store';
import { useConfirmDialog, useDialogWithData } from '../hooks/useDialog';
import { duplicateEnvironment } from '../helpers/environment';
import { SidebarPanel } from './SidebarPanel';
import { SidebarItem } from './SidebarItem';
import { Button } from './Button';
import { ContextMenu } from './ContextMenu';
import { ConfirmDialog } from './ConfirmDialog';
import { RenameForm } from '../forms/RenameForm';

interface EnvironmentListProps {
  environments: Environment[];
  activeEnvironmentId: string | null;
  selectedEnvironmentId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

interface MenuState {
  environment: Environment;
  x: number;
  y: number;
}

export function EnvironmentList({
  environments,
  activeEnvironmentId,
  selectedEnvironmentId,
  onSelect,
  onAdd,
}: EnvironmentListProps) {
  const {
    importEnvironment,
    exportEnvironment,
    setActiveEnvironment,
    deleteEnvironment,
    addEnvironment,
    saveEnvironment,
  } = useEnvironmentStore();
  const { showAlert } = useAlertStore();
  const confirmDialog = useConfirmDialog();
  const renameDialog = useDialogWithData<{ environment: Environment }>();

  const [menu, setMenu] = useState<MenuState | null>(null);

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        await importEnvironment(file);
        showAlert('Environment imported successfully', 'success');
      } catch {
        showAlert('Failed to import environment', 'error');
      }
    };
    input.click();
  };

  const openMenu = (e: React.MouseEvent, environment: Environment) => {
    e.preventDefault();
    setMenu({ environment, x: e.clientX, y: e.clientY });
  };

  const closeMenu = () => setMenu(null);

  const handleSetActive = async () => {
    if (!menu) return;
    try {
      await setActiveEnvironment(menu.environment.id);
    } catch {
      showAlert('Failed to set active environment', 'error');
    }
    closeMenu();
  };

  const handleRename = () => {
    if (!menu) return;
    renameDialog.open({ environment: menu.environment });
    closeMenu();
  };

  const handleDuplicate = async () => {
    if (!menu) return;
    try {
      const dup = duplicateEnvironment(menu.environment);
      addEnvironment(dup);
      await saveEnvironment(dup);
      showAlert('Environment duplicated', 'success');
    } catch {
      showAlert('Failed to duplicate environment', 'error');
    }
    closeMenu();
  };

  const handleExport = async () => {
    if (!menu) return;
    try {
      await exportEnvironment(menu.environment.id);
      showAlert('Environment exported', 'success');
    } catch {
      showAlert('Failed to export environment', 'error');
    }
    closeMenu();
  };

  const handleDelete = () => {
    if (!menu) return;
    const target = menu.environment;
    closeMenu();
    confirmDialog.open({
      title: 'Delete Environment',
      message: `Are you sure you want to delete "${target.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteEnvironment(target.id);
          showAlert('Environment deleted', 'success');
        } catch {
          showAlert('Failed to delete environment', 'error');
        }
      },
    });
  };

  const handleRenameSave = async (newName: string) => {
    const target = renameDialog.data?.environment;
    if (!target) return;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === target.name) return;
    try {
      await saveEnvironment({ ...target, name: trimmed });
      showAlert('Environment renamed', 'success');
    } catch {
      showAlert('Failed to rename environment', 'error');
    }
  };

  const headerActions = (
    <div className="flex items-center gap-1">
      <Button onClick={handleImport} variant="icon" size="sm" title="Import Environment">
        <Upload className="w-4 h-4" />
      </Button>
      <Button onClick={onAdd} variant="icon" size="sm" title="New Environment">
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );

  return (
    <SidebarPanel title="Environments" headerActions={headerActions}>
      {environments.length === 0 ? (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          <Globe className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p className="text-sm">No environments yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create one to manage variables</p>
        </div>
      ) : (
        <div className="py-1 space-y-2">
          {environments.map(env => (
            <SidebarItem
              key={env.id}
              isSelected={selectedEnvironmentId === env.id}
              onClick={() => onSelect(env.id)}
              onContextMenu={e => openMenu(e, env)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Globe className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                <span className="text-sm truncate">{env.name}</span>
                {activeEnvironmentId === env.id && (
                  <Zap className="w-3.5 h-3.5 text-green-500 shrink-0" />
                )}
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {env.variables.length} var{env.variables.length !== 1 ? 's' : ''}
              </span>
            </SidebarItem>
          ))}
        </div>
      )}

      {menu && (
        <ContextMenu
          position={{ x: menu.x, y: menu.y }}
          items={[
            ...(activeEnvironmentId === menu.environment.id
              ? []
              : [{
                  label: 'Set Active',
                  icon: <Check className="w-4 h-4 text-green-500" />,
                  onClick: handleSetActive,
                }]),
            { label: 'Rename', icon: <Pencil className="w-4 h-4" />, onClick: handleRename },
            { label: 'Duplicate', icon: <Copy className="w-4 h-4" />, onClick: handleDuplicate },
            { label: 'Export', icon: <Download className="w-4 h-4" />, onClick: handleExport },
            { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: handleDelete, danger: true },
          ]}
          onClose={closeMenu}
        />
      )}

      <ConfirmDialog {...confirmDialog.props} />

      <RenameForm
        isOpen={renameDialog.isOpen}
        onClose={renameDialog.close}
        onSave={handleRenameSave}
        currentName={renameDialog.data?.environment.name ?? ''}
        title="Rename Environment"
        label="Environment Name"
      />
    </SidebarPanel>
  );
}
