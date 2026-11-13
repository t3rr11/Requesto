import type { Environment } from '../store/environments/types';
import { Dialog } from '../components/Dialog';
import { EnvironmentHeader } from '../components/EnvironmentHeader';
import { VariableEditor } from '../components/VariableEditor';
import { useEnvironmentVariablesEditor } from '../hooks/useEnvironmentVariablesEditor';

interface EnvironmentVariablesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  environment: Environment;
}

export function EnvironmentVariablesDialog({ isOpen, onClose, environment }: Readonly<EnvironmentVariablesDialogProps>) {
  const { control, setValue, hasChanges, handleSave, handleNameChange, handleResetCurrentValue } =
    useEnvironmentVariablesEditor(environment, isOpen);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Environment Variables" size="full">
      <div className="flex h-[70vh] -m-6">
        <div className="flex-1 overflow-hidden flex flex-col min-w-0 bg-gray-50 dark:bg-gray-900">
          <EnvironmentHeader
            environment={environment}
            hasChanges={hasChanges}
            onSave={() => {
              void handleSave();
            }}
            onNameChange={name => {
              void handleNameChange(name);
            }}
          />
          <VariableEditor control={control} setValue={setValue} onResetCurrentValue={handleResetCurrentValue} />
        </div>
      </div>
    </Dialog>
  );
}
