import { useState, useRef, useEffect } from 'react';
import {
  MoreVertical,
  Check,
  Copy,
  Download,
  Trash2,
  Zap,
} from 'lucide-react';
import type { Environment } from '../store/environments/types';
import { useEnvironmentStore } from '../store/environments/store';
import { useAlertStore } from '../store/alert/store';
import { useConfirmDialog } from '../hooks/useDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { duplicateEnvironment } from '../helpers/environment';

interface EnvironmentHeaderProps {
  environment: Environment;
  hasChanges: boolean;
  onSave: () => void;
  onNameChange: (name: string) => void;
}

export function EnvironmentHeader({
  environment,
  hasChanges,
  onSave,
  onNameChange,
}: EnvironmentHeaderProps) {
  const { environmentsData, setActiveEnvironment, deleteEnvironment, addEnvironment, exportEnvironment } =
    useEnvironmentStore();
  const { showAlert } = useAlertStore();
  const confirmDialog = useConfirmDialog();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(environment.name);
  const menuRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isActive = environmentsData.activeEnvironmentId === environment.id;

  useEffect(() => {
    setEditName(environment.name);
  }, [environment.name]);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleNameSubmit = () => {
    setIsEditingName(false);
    if (editName.trim() && editName !== environment.name) {
      onNameChange(editName.trim());
    } else {
      setEditName(environment.name);
    }
  };

  const handleSetActive = () => {
    if (!isActive) {
      setActiveEnvironment(environment.id);
    }
    setIsMenuOpen(false);
  };

  const handleDuplicate = async () => {
    setIsMenuOpen(false);
    try {
      const dup = duplicateEnvironment(environment);
      await addEnvironment(dup);
      showAlert('Environment duplicated', 'success');
    } catch {
      showAlert('Failed to duplicate environment', 'error');
    }
  };

  const handleExport = async () => {
    setIsMenuOpen(false);
    try {
      await exportEnvironment(environment.id);
      showAlert('Environment exported', 'success');
    } catch {
      showAlert('Failed to export environment', 'error');
    }
  };

  const handleDelete = () => {
    setIsMenuOpen(false);
    confirmDialog.open({
      title: 'Delete Environment',
      message: `Are you sure you want to delete "${environment.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteEnvironment(environment.id);
          showAlert('Environment deleted', 'success');
        } catch {
          showAlert('Failed to delete environment', 'error');
        }
      },
    });
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {isEditingName ? (
          <input
            ref={nameInputRef}
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={e => {
              if (e.key === 'Enter') handleNameSubmit();
              if (e.key === 'Escape') {
                setEditName(environment.name);
                setIsEditingName(false);
              }
            }}
            className="text-xl font-semibold bg-transparent border-b-2 border-blue-500 focus:outline-none text-gray-900 dark:text-gray-100"
          />
        ) : (
          <h2
            className="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
            onDoubleClick={() => setIsEditingName(true)}
            title="Double-click to rename"
          >
            {environment.name}
          </h2>
        )}

        {isActive && (
          <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30 rounded-full">
            <Zap className="w-3 h-3" />
            Active
          </span>
        )}

        {hasChanges && (
          <span className="text-xs text-amber-500 dark:text-amber-400">(unsaved)</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {hasChanges && (
          <button
            onClick={onSave}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            Save
          </button>
        )}

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
              <button
                onClick={handleSetActive}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg"
              >
                <Check className={`w-4 h-4 ${isActive ? 'text-green-500' : 'text-transparent'}`} />
                {isActive ? 'Deactivate' : 'Set Active'}
              </button>
              <button
                onClick={handleDuplicate}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Copy className="w-4 h-4" />
                Duplicate
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 last:rounded-b-lg"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog {...confirmDialog.props} />
    </div>
  );
}
