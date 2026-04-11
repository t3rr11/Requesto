import { Upload, Plus, Zap, Globe } from 'lucide-react';
import type { Environment } from '../store/environments/types';
import { useEnvironmentStore } from '../store/environments/store';
import { useAlertStore } from '../store/alert/store';
import { SidebarPanel } from './SidebarPanel';
import { SidebarItem } from './SidebarItem';
import { Button } from './Button';

interface EnvironmentListProps {
  environments: Environment[];
  activeEnvironmentId: string | null;
  selectedEnvironmentId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

export function EnvironmentList({
  environments,
  activeEnvironmentId,
  selectedEnvironmentId,
  onSelect,
  onAdd,
}: EnvironmentListProps) {
  const { importEnvironment } = useEnvironmentStore();
  const { showAlert } = useAlertStore();

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
    </SidebarPanel>
  );
}
