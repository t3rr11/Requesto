import { Shield, AlertCircle } from 'lucide-react';
import { OAuthConfig } from '../types';

interface OAuthConfigListProps {
  configs: OAuthConfig[];
  selectedConfigId: string | null;
  isLoadingConfigs: boolean;
  onConfigSelect: (config: OAuthConfig) => void;
}

export const OAuthConfigList = ({
  configs,
  selectedConfigId,
  isLoadingConfigs,
  onConfigSelect,
}: OAuthConfigListProps) => {
  return (
    <div className="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Your Configurations
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {isLoadingConfigs ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
          </div>
        ) : configs.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No configurations yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create one to get started</p>
          </div>
        ) : (
          configs.map(config => (
            <button
              key={config.id}
              onClick={() => onConfigSelect(config)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                selectedConfigId === config.id
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="truncate">{config.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {config.provider === 'custom' ? 'Custom Provider' : config.provider}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {config.flowType === 'authorization-code-pkce'
                      ? 'Auth Code (PKCE)'
                      : config.flowType === 'authorization-code'
                      ? 'Auth Code'
                      : config.flowType === 'client-credentials'
                      ? 'Client Credentials'
                      : config.flowType === 'implicit'
                      ? 'Implicit'
                      : config.flowType === 'password'
                      ? 'Password'
                      : config.flowType}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
