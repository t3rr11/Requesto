import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Globe, Plus } from 'lucide-react';
import { useEnvironmentStore } from '../store/environments/store';
import { useAlertStore } from '../store/alert/store';
import { Dialog } from '../components/Dialog';
import { EnvironmentList } from '../components/EnvironmentList';
import { EnvironmentHeader } from '../components/EnvironmentHeader';
import { VariableEditor } from '../components/VariableEditor';
import { EmptyState } from '../components/EmptyState';
import { NewEnvironmentForm } from './NewEnvironmentForm';
import { useDialog } from '../hooks/useDialog';
import type { Environment, EnvironmentVariable } from '../store/environments/types';

interface EnvironmentFormData {
  variables: EnvironmentVariable[];
}

interface EnvironmentManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EnvironmentManagerDialog({ isOpen, onClose }: EnvironmentManagerDialogProps) {
  const { environmentsData, loadEnvironments, saveEnvironment, updateEnvironment: storeUpdateEnvironment } =
    useEnvironmentStore();
  const { showAlert } = useAlertStore();
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const lastSavedRef = useRef<string>('');
  const newEnvDialog = useDialog();

  // Load environments when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadEnvironments();
    }
  }, [isOpen, loadEnvironments]);

  // Auto-select the active environment or first available on open
  useEffect(() => {
    if (!isOpen) return;
    if (selectedEnvId && environmentsData.environments.some(e => e.id === selectedEnvId)) return;

    const defaultId = environmentsData.activeEnvironmentId
      ?? environmentsData.environments[0]?.id
      ?? null;
    setSelectedEnvId(defaultId);
  }, [isOpen, environmentsData.environments, environmentsData.activeEnvironmentId, selectedEnvId]);

  const selectedEnvironment = environmentsData.environments.find(e => e.id === selectedEnvId);

  const form = useForm<EnvironmentFormData>({
    defaultValues: { variables: [] },
  });

  const { control, reset, watch, getValues } = form;

  // Sync form with selected environment and snapshot the saved state
  useEffect(() => {
    if (selectedEnvironment) {
      const vars = selectedEnvironment.variables;
      reset({ variables: vars });
      lastSavedRef.current = JSON.stringify(vars);
      setHasChanges(false);
    }
  }, [selectedEnvId, selectedEnvironment, reset]);

  // Watch for real changes by comparing to saved snapshot
  useEffect(() => {
    const subscription = watch((formValues) => {
      const current = JSON.stringify(formValues.variables ?? []);
      setHasChanges(current !== lastSavedRef.current);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const handleAdd = () => {
    newEnvDialog.open();
  };

  const handleNewEnvCreated = (id: string) => {
    setSelectedEnvId(id);
    newEnvDialog.close();
  };

  const handleSave = useCallback(async () => {
    if (!selectedEnvironment) return;
    const formData = getValues();
    const updatedEnv: Environment = {
      ...selectedEnvironment,
      variables: formData.variables,
    };
    try {
      await saveEnvironment(updatedEnv);
      lastSavedRef.current = JSON.stringify(formData.variables);
      setHasChanges(false);
      showAlert('Environment saved', 'success');
    } catch {
      showAlert('Failed to save environment', 'error');
    }
  }, [selectedEnvironment, getValues, saveEnvironment, showAlert]);

  const handleNameChange = useCallback(
    async (newName: string) => {
      if (!selectedEnvironment) return;
      try {
        storeUpdateEnvironment({ ...selectedEnvironment, name: newName });
        await saveEnvironment({ ...selectedEnvironment, name: newName });
      } catch {
        showAlert('Failed to rename environment', 'error');
      }
    },
    [selectedEnvironment, storeUpdateEnvironment, saveEnvironment, showAlert],
  );

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && selectedEnvironment) {
          handleSave();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasChanges, selectedEnvironment, handleSave]);

  // Reset selection state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedEnvId(null);
      setHasChanges(false);
      lastSavedRef.current = '';
    }
  }, [isOpen]);

  const sidebar = (
    <EnvironmentList
      environments={environmentsData.environments}
      activeEnvironmentId={environmentsData.activeEnvironmentId}
      selectedEnvironmentId={selectedEnvId}
      onSelect={setSelectedEnvId}
      onAdd={handleAdd}
    />
  );

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Manage Environments" size="full">
      <div className="flex h-[70vh] -m-6">
        <div className="shrink-0">{sidebar}</div>
        <div className="flex-1 overflow-hidden flex flex-col min-w-0 bg-gray-50 dark:bg-gray-900">
          {selectedEnvironment ? (
            <>
              <EnvironmentHeader
                environment={selectedEnvironment}
                hasChanges={hasChanges}
                onSave={handleSave}
                onNameChange={handleNameChange}
              />
              <VariableEditor control={control} />
            </>
          ) : (
            <EmptyState
              icon={<Globe className="w-12 h-12" />}
              title="No environment selected"
              description="Select an environment from the sidebar or create a new one"
              action={{
                label: 'New Environment',
                onClick: handleAdd,
                icon: <Plus className="w-4 h-4" />,
              }}
            />
          )}
        </div>
      </div>

      <Dialog isOpen={newEnvDialog.isOpen} onClose={newEnvDialog.close} title="New Environment">
        <NewEnvironmentForm onSuccess={handleNewEnvCreated} onCancel={newEnvDialog.close} />
      </Dialog>
    </Dialog>
  );
}
