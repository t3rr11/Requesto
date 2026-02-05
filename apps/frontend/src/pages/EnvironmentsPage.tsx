import { z } from 'zod';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Globe, Settings } from 'lucide-react';
import { useEnvironmentStore } from '../store/environments';
import { Environment } from '../types';
import { useAlertStore } from '../store/alert';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Button } from '../components/Button';
import { EnvironmentList } from '../components/EnvironmentList';
import { EnvironmentHeader } from '../components/EnvironmentHeader';
import { VariableEditor } from '../components/VariableEditor';
import { useNavigate } from 'react-router';
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
  const { environmentsData, loadEnvironments, saveEnvironment, deleteEnvironment, setActiveEnvironment } =
    useEnvironmentStore();
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const { showAlert } = useAlertStore();
  const navigate = useNavigate();
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
      console.error('Failed to save environment:', error);
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
      console.error('Failed to delete environment:', error);
      showAlert('Delete Failed', 'Failed to delete environment. Please try again.', 'error');
    }
  };

  const handleSetActive = async () => {
    if (!selectedEnvId) return;

    try {
      await setActiveEnvironment(selectedEnvId);
      showAlert('Success', 'Environment set as active', 'success');
    } catch (error) {
      console.error('Failed to set active environment:', error);
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

  const isActive = environmentsData.activeEnvironmentId === selectedEnvId;
  const isNewEnvironment = selectedEnvId ? !environmentsData.environments.find(e => e.id === selectedEnvId) : false;

  return (
    <main className="overflow-hidden relative w-full h-full">
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-500" />
                <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Environments</h1>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage variables across different environments</p>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={createNew} variant="primary" size="sm" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Environment
              </Button>
              <Button onClick={() => navigate('/requests')} variant="secondary" size="sm">
                Close
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* Environments List */}
          <EnvironmentList
            environments={environmentsData.environments}
            selectedEnvId={selectedEnvId}
            activeEnvironmentId={environmentsData.activeEnvironmentId}
            isNewEnvironment={isNewEnvironment}
            onEnvironmentSelect={handleEnvironmentSelect}
          />

          {/* Environment Details */}
          <div className="flex-1 overflow-hidden flex flex-col min-w-0">
            {selectedEnvId ? (
              <form onSubmit={handleSubmit(handleSave)} className="flex-1 flex flex-col overflow-hidden">
                {/* Environment Header */}
                <EnvironmentHeader
                  name={formValues.name}
                  isActive={isActive}
                  hasUnsavedChanges={hasUnsavedChanges}
                  onNameChange={handleNameChange}
                  onSetActive={handleSetActive}
                  onDuplicate={handleDuplicate}
                  onDelete={() => selectedEnvId && handleDeleteClick(selectedEnvId)}
                  onSave={handleSave}
                  canDelete={environmentsData.environments.length > 1 || isNewEnvironment}
                />

                {errors.name && (
                  <div className="bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800 px-6 py-2">
                    <p className="text-red-600 dark:text-red-400 text-sm">{errors.name.message}</p>
                  </div>
                )}

                {/* Variables Section */}
                <VariableEditor control={control} />
              </form>
            ) : (
              // Empty state
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-sm">
                  <Globe className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No Environment Selected</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Create your first environment to manage variables across different deployment targets
                  </p>
                  <Button onClick={createNew} variant="primary" size="md" className="flex items-center gap-2 mx-auto">
                    <Plus className="w-4 h-4" />
                    Create Environment
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Confirm Delete Dialog */}
        <ConfirmDialog
          isOpen={confirmDelete !== null}
          onClose={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
          title="Delete Environment"
          message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          variant="danger"
        />
      </div>
    </main>
  );
};
