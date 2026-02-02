import { Globe, AlertCircle } from 'lucide-react';
import { Environment } from '../store/useEnvironmentStore';

interface EnvironmentListProps {
  environments: Environment[];
  selectedEnvId: string | null;
  activeEnvironmentId: string | null;
  isNewEnvironment: boolean;
  onEnvironmentSelect: (env: Environment) => void;
}

export const EnvironmentList = ({
  environments,
  selectedEnvId,
  activeEnvironmentId,
  isNewEnvironment,
  onEnvironmentSelect,
}: EnvironmentListProps) => {
  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Environments</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {environments.length === 0 && !isNewEnvironment && (
          <div className="text-center py-12 px-4">
            <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">No environments yet</p>
            <p className="text-xs text-gray-400 mt-1">Create one to get started</p>
          </div>
        )}

        {environments.map(env => (
          <button
            key={env.id}
            onClick={() => onEnvironmentSelect(env)}
            className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
              selectedEnvId === env.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate">{env.name}</span>
                  {activeEnvironmentId === env.id && (
                    <span className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full" title="Active" />
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {env.variables.length} {env.variables.length === 1 ? 'variable' : 'variables'}
                </div>
              </div>
            </div>
          </button>
        ))}

        {/* Show new environment in list */}
        {isNewEnvironment && (
          <div className="px-3 py-2.5 rounded-lg bg-blue-50 border-2 border-blue-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium text-blue-700">New Environment</div>
                <div className="text-xs text-blue-600">Not saved yet</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
