import { Globe, AlertCircle, Upload } from 'lucide-react';
import { Environment } from '../types';
import { Button } from './Button';
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
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Your Environments</h2>
          <Button onClick={handleImportClick} variant="icon" size="sm" title="Import Environment">
            <Upload className="w-4 h-4" />
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {environments.length === 0 && !isNewEnvironment && (
          <div className="text-center py-12 px-4">
            <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No environments yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create one to get started</p>
          </div>
        )}

        {environments.map(env => (
          <Button
            key={env.id}
            onClick={() => onEnvironmentSelect(env)}
            onContextMenu={(e) => onEnvironmentContextMenu(e, env)}
            variant="ghost"
            size="md"
            className={`w-full justify-start text-left rounded-lg ${
              selectedEnvId === env.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
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
          </Button>
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
      </div>
    </div>
  );
};
