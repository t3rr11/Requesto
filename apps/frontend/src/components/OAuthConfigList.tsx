import { Shield, Plus } from 'lucide-react';
import type { OAuthConfig } from '../store/oauth/types';
import { SidebarPanel } from './SidebarPanel';
import { SidebarItem } from './SidebarItem';
import { EmptyState } from './EmptyState';
import { Button } from './Button';

interface OAuthConfigListProps {
  configs: OAuthConfig[];
  selectedConfigId: string | null;
  isLoadingConfigs: boolean;
  onConfigSelect: (config: OAuthConfig) => void;
  onAdd: () => void;
}

const flowTypeLabels: Record<string, string> = {
  'authorization-code-pkce': 'Auth Code (PKCE)',
  'authorization-code': 'Auth Code',
  'client-credentials': 'Client Credentials',
  implicit: 'Implicit',
  password: 'Password',
};

export function OAuthConfigList({ configs, selectedConfigId, isLoadingConfigs, onConfigSelect, onAdd }: OAuthConfigListProps) {
  const headerActions = (
    <Button onClick={onAdd} variant="icon" size="sm" title="New Config">
      <Plus className="w-4 h-4" />
    </Button>
  );

  return (
    <SidebarPanel title="Configurations" headerActions={headerActions} isLoading={isLoadingConfigs}>
      {configs.length === 0 ? (
        <EmptyState
          icon={<Shield className="w-12 h-12" />}
          title="No configurations yet"
          description="Create one to get started"
          size="sm"
        />
      ) : (
        configs.map(config => (
          <SidebarItem
            key={config.id}
            isSelected={selectedConfigId === config.id}
            onClick={() => onConfigSelect(config)}
          >
            <div className="flex w-full gap-2">
              <div className="flex-1 min-w-0">
                <div className="truncate">{config.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {config.provider === 'custom' ? 'Custom Provider' : config.provider}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {flowTypeLabels[config.flowType] || config.flowType}
                </div>
              </div>
            </div>
          </SidebarItem>
        ))
      )}
    </SidebarPanel>
  );
}
