import { z } from 'zod';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Globe, Settings, Download, Trash2 } from 'lucide-react';
import { useEnvironmentStore } from '../store/environments';
import { Environment } from '../types';
import { useAlertStore } from '../store/alert';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageShell } from '../components/PageShell';
import { EmptyState } from '../components/EmptyState';
import { EnvironmentList } from '../components/EnvironmentList';
import { EnvironmentHeader } from '../components/EnvironmentHeader';
import { VariableEditor } from '../components/VariableEditor';
import { ContextMenu } from '../components/ContextMenu';
import {
  createNewEnvironment,
  duplicateEnvironment as duplicateEnv,
  prepareEnvironmentForSave,
} from '../helpers/environmentHelpers';

// Validation schema
const environmentVariableSchema = z.object({
  key: z.string(),
  value: z.string(),
  enabled: z.boolean(),
  isSecret: z.boolean().optional(),
});

const environmentFormSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Environment name is required'),
  variables: z.array(environmentVariableSchema),
});

type EnvironmentFormData = z.infer<typeof environmentFormSchema>;

export const EnvironmentsPage = () => {
  const {
    environmentsData,
    loadEnvironments,
    saveEnvironment,
    deleteEnvironment,
    setActiveEnvironment,
    importEnvironment,
    exportEnvironment,
  } = useEnvironmentStore();
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [environmentContextMenu, setEnvironmentContextMenu] = useState<{
    x: number;
    y: number;
    environment: Environment;
  } | null>(null);
  const { showAlert } = useAlertStore();
  const lastSavedValuesRef = useRef<string>('');

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EnvironmentFormData>({
    resolver: zodResolver(environmentFormSchema),
    defaultValues: {
      id: '',
      name: '',
      variables: [],
    },
  });

  const formValues = watch();

  useEffect(() => {
    loadEnvironments();
  }, []);

  // Auto-select first environment if none selected
  useEffect(() => {
    if (environmentsData.environments.length > 0 && !selectedEnvId) {
      const envToSelect = environmentsData.activeEnvironmentId
        ? environmentsData.environments.find(e => e.id === environmentsData.activeEnvironmentId)
        : environmentsData.environments[0];

      if (envToSelect) {
        handleEnvironmentSelect(envToSelect);
      }
    }
  }, [environmentsData.environments.length, selectedEnvId]);

  // Track unsaved changes
  useEffect(() => {
    if (selectedEnvId && formValues.name) {
      const currentValues = JSON.stringify({
        id: formValues.id,
        name: formValues.name,
        variables: formValues.variables,
      });

      setHasUnsavedChanges(currentValues !== lastSavedValuesRef.current);
    }
  }, [formValues, selectedEnvId]);

  // Keyboard shortcut for save (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges && selectedEnvId) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, selectedEnvId, formValues]);

  const handleSave = async () => {
    if (!formValues.name.trim()) {
      showAlert('Validation Error', 'Environment name is required', 'error');
      return;
    }

    try {
      const environment = prepareEnvironmentForSave({
        id: formValues.id,
        name: formValues.name,
        variables: formValues.variables,
      });

      await saveEnvironment(environment);

      lastSavedValuesRef.current = JSON.stringify({
        id: environment.id,
        name: environment.name,
        variables: environment.variables,
      });

      setHasUnsavedChanges(false);
    } catch (error) {
      showAlert('Save Failed', 'Failed to save environment. Please try again.', 'error');
    }
  };

  const handleDeleteClick = (id: string) => {
    const env = environmentsData.environments.find(e => e.id === id);
    if (env) {
      setConfirmDelete({ id, name: env.name });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    setConfirmDelete(null);

    try {
      await deleteEnvironment(id);

      if (selectedEnvId === id) {
        const remaining = environmentsData.environments.filter(e => e.id !== id);
        if (remaining.length > 0) {
          handleEnvironmentSelect(remaining[0]);
        } else {
          setSelectedEnvId(null);
          lastSavedValuesRef.current = '';
          setHasUnsavedChanges(false);
        }
      }

      showAlert('Success', 'Environment deleted successfully', 'success');
    } catch (error) {
      showAlert('Delete Failed', 'Failed to delete environment. Please try again.', 'error');
    }
  };

  const handleSetActive = async () => {
    if (!selectedEnvId) return;

    try {
      await setActiveEnvironment(selectedEnvId);
      showAlert('Success', 'Environment set as active', 'success');
    } catch (error) {
      showAlert('Activation Failed', 'Failed to set active environment. Please try again.', 'error');
    }
  };

  const createNew = () => {
    const newEnv = createNewEnvironment();
    const newEnvData = {
      id: newEnv.id,
      name: newEnv.name,
      variables: newEnv.variables,
    };

    reset(newEnvData);
    lastSavedValuesRef.current = '';
    setSelectedEnvId(newEnv.id);
    setHasUnsavedChanges(true);
  };

  const handleDuplicate = () => {
    if (!selectedEnvId) return;

    const env = environmentsData.environments.find(e => e.id === selectedEnvId);
    if (!env) return;

    const duplicated = duplicateEnv(env);
    const duplicatedData = {
      id: duplicated.id,
      name: duplicated.name,
      variables: duplicated.variables,
    };

    reset(duplicatedData);
    lastSavedValuesRef.current = '';
    setSelectedEnvId(duplicated.id);
    setHasUnsavedChanges(true);
  };

  const handleEnvironmentSelect = (env: Environment) => {
    setSelectedEnvId(env.id);
    const envData = {
      id: env.id,
      name: env.name,
      variables: env.variables.length > 0 ? env.variables : [],
    };
    reset(envData);
    lastSavedValuesRef.current = JSON.stringify(envData);
    setHasUnsavedChanges(false);
  };

  const handleNameChange = (name: string) => {
    setValue('name', name, { shouldValidate: true });
  };

  const handleEnvironmentContextMenu = (e: React.MouseEvent, env: Environment) => {
    e.preventDefault();
    setEnvironmentContextMenu({
      x: e.clientX,
      y: e.clientY,
      environment: env,
    });
  };

  const closeEnvironmentContextMenu = () => {
    setEnvironmentContextMenu(null);
  };

  const handleImport = async (file: File) => {
    try {
      const imported = await importEnvironment(file);
      showAlert('Environment imported successfully', 'success');
      handleEnvironmentSelect(imported);
    } catch (error) {
      showAlert('Failed to import environment. Please check the file format.', 'error');
    }
  };

  const handleExportFromContext = async () => {
    if (!environmentContextMenu) return;

    try {
      await exportEnvironment(environmentContextMenu.environment.id);
      showAlert('Environment exported successfully', 'success');
    } catch (error) {
      showAlert('Failed to export environment', 'error');
    }
    closeEnvironmentContextMenu();
  };

  const handleDuplicateFromContext = () => {
    if (!environmentContextMenu) return;

    const duplicated = duplicateEnv(environmentContextMenu.environment);
    const duplicatedData = {
      id: duplicated.id,
      name: duplicated.name,
      variables: duplicated.variables,
    };

    reset(duplicatedData);
    lastSavedValuesRef.current = '';
    setSelectedEnvId(duplicated.id);
    setHasUnsavedChanges(true);
    closeEnvironmentContextMenu();
  };

  const handleDeleteFromContext = () => {
    if (!environmentContextMenu) return;
    const env = environmentContextMenu.environment;

    if (environmentsData.environments.length <= 1 && !isNewEnvironment) {
      showAlert('Cannot delete the last environment', 'error');
      closeEnvironmentContextMenu();
      return;
    }

    setConfirmDelete({ id: env.id, name: env.name });
    closeEnvironmentContextMenu();
  };

  const handleExport = async () => {
    if (!selectedEnvId) return;

    try {
      await exportEnvironment(selectedEnvId);
      showAlert('Environment exported successfully', 'success');
    } catch (error) {
      showAlert('Failed to export environment', 'error');
    }
  };

  const isActive = environmentsData.activeEnvironmentId === selectedEnvId;
  const isNewEnvironment = selectedEnvId ? !environmentsData.environments.find(e => e.id === selectedEnvId) : false;

  return (
    <>
      <PageShell
        icon={<Settings className="w-5 h-5 text-blue-500" />}
        title="Environments"
        subtitle="Manage variables across different environments"
        actions={[
          { label: 'New Environment', icon: <Plus className="w-4 h-4" />, onClick: createNew },
        ]}
        sidebar={
          <EnvironmentList
            environments={environmentsData.environments}
            selectedEnvId={selectedEnvId}
            activeEnvironmentId={environmentsData.activeEnvironmentId}
            isNewEnvironment={isNewEnvironment}
            onEnvironmentSelect={handleEnvironmentSelect}
            onEnvironmentContextMenu={handleEnvironmentContextMenu}
            onImport={handleImport}
          />
        }
      >
        {selectedEnvId ? (
          <form onSubmit={handleSubmit(handleSave)} className="flex-1 flex flex-col overflow-hidden">
            <EnvironmentHeader
              name={formValues.name}
              isActive={isActive}
              hasUnsavedChanges={hasUnsavedChanges}
              onNameChange={handleNameChange}
              onSetActive={handleSetActive}
              onDuplicate={handleDuplicate}
              onDelete={() => selectedEnvId && handleDeleteClick(selectedEnvId)}
              onSave={handleSave}
              onExport={handleExport}
              canDelete={environmentsData.environments.length > 1 || isNewEnvironment}
            />

            {errors.name && (
              <div className="bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 px-6 py-2">
                <p className="text-red-600 dark:text-red-400 text-sm">{errors.name.message}</p>
              </div>
            )}

            <VariableEditor control={control} />
          </form>
        ) : (
          <EmptyState
            icon={<Globe className="w-16 h-16" />}
            title="No Environment Selected"
            description="Create your first environment to manage variables across different deployment targets"
            action={{ label: 'Create Environment', icon: <Plus className="w-4 h-4" />, onClick: createNew }}
          />
        )}
      </PageShell>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Environment"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {environmentContextMenu && (
        <ContextMenu
          position={{ x: environmentContextMenu.x, y: environmentContextMenu.y }}
          items={[
            {
              label: 'Export',
              icon: <Download className="w-4 h-4" />,
              onClick: handleExportFromContext,
            },
            {
              label: 'Duplicate',
              icon: <Globe className="w-4 h-4" />,
              onClick: handleDuplicateFromContext,
            },
            {
              label: 'Delete',
              icon: <Trash2 className="w-4 h-4" />,
              onClick: handleDeleteFromContext,
              danger: true,
            },
          ]}
          onClose={closeEnvironmentContextMenu}
        />
      )}
    </>
  );
};
