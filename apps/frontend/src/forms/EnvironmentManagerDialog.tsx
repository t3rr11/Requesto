import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, type FieldPath, type PathValue } from 'react-hook-form';
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

export function EnvironmentManagerDialog({ isOpen, onClose }: Readonly<EnvironmentManagerDialogProps>) {
  const { environmentsData, loadEnvironments, saveEnvironment, updateEnvironment, updateCurrentValues, resetCurrentValues } =
    useEnvironmentStore();
  const { showAlert } = useAlertStore();
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const lastSavedRef = useRef<string>('');
  const dirtyRef = useRef(false);
  const loadedEnvIdRef = useRef<string | null>(null);
  const newEnvDialog = useDialog();

  // Load environments when dialog opens
  useEffect(() => {
    if (isOpen) {
      void loadEnvironments();
    }
  }, [isOpen, loadEnvironments]);

  // Auto-select the active environment or first available on open
  useEffect(() => {
    if (!isOpen) return;
    if (selectedEnvId && environmentsData.environments.some(e => e.id === selectedEnvId)) return;

    const defaultId = environmentsData.activeEnvironmentId ?? environmentsData.environments[0]?.id ?? null;
    setSelectedEnvId(defaultId);
  }, [isOpen, environmentsData.environments, environmentsData.activeEnvironmentId, selectedEnvId]);

  const selectedEnvironment = environmentsData.environments.find(e => e.id === selectedEnvId);

  const form = useForm<EnvironmentFormData>({
    defaultValues: { variables: [] },
  });

  const { control, reset, watch, getValues, setValue } = form;

  // Sync form with selected environment and snapshot the saved state
  useEffect(() => {
    if (selectedEnvironment) {
      if (dirtyRef.current && loadedEnvIdRef.current === selectedEnvironment.id) return;
      loadedEnvIdRef.current = selectedEnvironment.id;
      const vars = selectedEnvironment.variables;
      reset({ variables: vars });
      lastSavedRef.current = JSON.stringify(vars);
      setHasChanges(false);
      dirtyRef.current = false;
    }
  }, [selectedEnvId, selectedEnvironment, reset]);

  // Watch for real changes by comparing to saved snapshot
  useEffect(() => {
    const subscription = watch(formValues => {
      const current = JSON.stringify(formValues.variables ?? []);
      const dirty = current !== lastSavedRef.current;
      setHasChanges(dirty);
      dirtyRef.current = dirty;
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

    // Keys whose sidecar override must not survive this save: the variable
    // row was deleted, or its current value was blanked. Without this, the
    // override resurrects the variable (as an empty read-back entry) on the
    // next load, even after an app restart.
    const staleKeys = selectedEnvironment.variables
      .filter(v => v.key && v.currentValue !== undefined && v.currentValue !== '')
      .map(v => v.key)
      .filter(key => {
        const row = formData.variables.find(v => v.key === key);
        return !row || row.currentValue === undefined || row.currentValue === '';
      });

    const updatedEnv: Environment = {
      ...selectedEnvironment,
      variables: formData.variables,
    };
    try {
      await saveEnvironment(updatedEnv);

      // Persist current-value overrides to the local sidecar.
      // Build a map of key -> currentValue for every variable that has one set.
      const overrides: Record<string, string> = {};
      formData.variables.forEach(v => {
        if (v.key && v.currentValue !== undefined && v.currentValue !== '') {
          overrides[v.key] = v.currentValue;
        }
      });
      await updateCurrentValues(selectedEnvironment.id, overrides);
      await Promise.all(staleKeys.map(key => resetCurrentValues(selectedEnvironment.id, key)));

      lastSavedRef.current = JSON.stringify(formData.variables);
      setHasChanges(false);
      dirtyRef.current = false;
      loadedEnvIdRef.current = null; // let the next store update re-sync the form
      showAlert('Environment saved', 'success');
    } catch {
      showAlert('Failed to save environment', 'error');
    }
  }, [selectedEnvironment, getValues, saveEnvironment, updateCurrentValues, resetCurrentValues, showAlert]);

  const handleNameChange = useCallback(
    async (newName: string) => {
      if (!selectedEnvironment) return;
      try {
        updateEnvironment({ ...selectedEnvironment, name: newName });
        await saveEnvironment({ ...selectedEnvironment, name: newName });
      } catch {
        showAlert('Failed to rename environment', 'error');
      }
    },
    [selectedEnvironment, updateEnvironment, saveEnvironment, showAlert]
  );

  // Clear the row's current value in the form too, so the editor reflects the
  // reset even while the form has other unsaved edits.
  const handleResetCurrentValue = useCallback(
    (key: string) => {
      if (!selectedEnvironment) return;
      void resetCurrentValues(selectedEnvironment.id, key);
      const idx = getValues().variables.findIndex(v => v.key === key);
      if (idx >= 0) {
        setValue(
          `variables.${idx}.currentValue` as FieldPath<EnvironmentFormData>,
          '' as PathValue<EnvironmentFormData, FieldPath<EnvironmentFormData>>,
        );
      }
    },
    [selectedEnvironment, resetCurrentValues, getValues, setValue]
  );

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && selectedEnvironment) {
          void handleSave();
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
      dirtyRef.current = false;
      loadedEnvIdRef.current = null;
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
              <VariableEditor
                control={control}
                setValue={setValue}
                onResetCurrentValue={handleResetCurrentValue}
              />
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
