import { useState, useEffect } from 'react';
import { Globe, Plus } from 'lucide-react';
import { useEnvironmentStore } from '../store/environments/store';
import { Dialog } from '../components/Dialog';
import { EnvironmentList } from '../components/EnvironmentList';
import { EnvironmentHeader } from '../components/EnvironmentHeader';
import { VariableEditor } from '../components/VariableEditor';
import { EmptyState } from '../components/EmptyState';
import { NewEnvironmentForm } from './NewEnvironmentForm';
import { useDialog } from '../hooks/useDialog';
import { useEnvironmentVariablesEditor } from '../hooks/useEnvironmentVariablesEditor';

interface EnvironmentManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EnvironmentManagerDialog({ isOpen, onClose }: Readonly<EnvironmentManagerDialogProps>) {
  const { environmentsData, loadEnvironments } = useEnvironmentStore();
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
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

  const selectedEnvironment = environmentsData.environments.find(e => e.id === selectedEnvId) ?? null;
  const { control, setValue, hasChanges, handleSave, handleNameChange, handleResetCurrentValue } =
    useEnvironmentVariablesEditor(selectedEnvironment, isOpen);

  const handleAdd = () => {
    newEnvDialog.open();
  };

  const handleNewEnvCreated = (id: string) => {
    setSelectedEnvId(id);
    newEnvDialog.close();
  };

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
