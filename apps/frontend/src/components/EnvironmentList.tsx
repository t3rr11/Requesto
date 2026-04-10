import { Globe, AlertCircle, Upload } from 'lucide-react';
import { Environment } from '../types';
import { Button } from './Button';
import { SidebarPanel } from './SidebarPanel';
import { SidebarItem } from './SidebarItem';
import { EmptyState } from './EmptyState';
import { useRef } from 'react';

interface EnvironmentListProps {
  environments: Environment[];
  selectedEnvId: string | null;
  activeEnvironmentId: string | null;
  isNewEnvironment: boolean;
  onEnvironmentSelect: (env: Environment) => void;
  onEnvironmentContextMenu: (e: React.MouseEvent, env: Environment) => void;
  onImport: (file: File) => void;
}

export const EnvironmentList = ({
  environments,
  selectedEnvId,
  activeEnvironmentId,
  isNewEnvironment,
  onEnvironmentSelect,
  onEnvironmentContextMenu,
  onImport,
}: EnvironmentListProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <SidebarPanel
      title="Your Environments"
      headerActions={
        <>
          <Button onClick={handleImportClick} variant="icon" size="sm" title="Import Environment">
            <Upload className="w-4 h-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </>
      }
    >
      {environments.length === 0 && !isNewEnvironment ? (
        <EmptyState
          icon={<Globe className="w-12 h-12" />}
          title="No environments yet"
          description="Create one to get started"
          size="sm"
        />
      ) : (
        <>
          {environments.map(env => (
            <SidebarItem
              key={env.id}
              isSelected={selectedEnvId === env.id}
              onClick={() => onEnvironmentSelect(env)}
              onContextMenu={(e) => onEnvironmentContextMenu(e, env)}
            >
              <div className="flex items-center justify-between gap-2 w-full">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate">{env.name}</span>
                    {activeEnvironmentId === env.id && (
                      <span className="flex-shrink-0 w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full" title="Active" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {env.variables.length} {env.variables.length === 1 ? 'variable' : 'variables'}
                  </div>
                </div>
              </div>
            </SidebarItem>
          ))}

          {isNewEnvironment && (
            <div className="px-3 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-blue-700 dark:text-blue-400">New Environment</div>
                  <div className="text-xs text-blue-600 dark:text-blue-500">Not saved yet</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </SidebarPanel>
  );
};
