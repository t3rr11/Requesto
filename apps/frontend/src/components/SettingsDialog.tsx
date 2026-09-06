import { Database, Key, Settings as SettingsIcon } from 'lucide-react';
import { Dialog } from './Dialog';
import { GeneralSettingsForm } from '../forms/GeneralSettingsForm';
import { GraphQLSchemasSettings } from '../forms/settings/GraphQLSchemasSettings';
import { OAuthManagerContent } from '../forms/OAuthManagerContent';
import { useUIStore } from '../store/ui/store';
import type { SettingsTab } from '../store/ui/types';

type SettingsSection = {
  id: SettingsTab;
  label: string;
  icon: React.ReactNode;
  group: 'Application' | 'Workspace';
};

const SECTIONS: SettingsSection[] = [
  { id: 'general', label: 'General', icon: <SettingsIcon className="w-4 h-4" />, group: 'Application' },
  { id: 'graphql-schemas', label: 'GraphQL Schemas', icon: <Database className="w-4 h-4" />, group: 'Workspace' },
  { id: 'oauth-configs', label: 'OAuth Configs', icon: <Key className="w-4 h-4" />, group: 'Workspace' },
];

const ApplicationSections = SECTIONS.filter(section => section.group === 'Application');
const WorkspaceSections = SECTIONS.filter(section => section.group === 'Workspace');

export function SettingsDialog() {
  const isOpen = useUIStore(s => s.isSettingsOpen);
  const activeTab = useUIStore(s => s.settingsTab);
  const closeSettings = useUIStore(s => s.closeSettings);
  const setSettingsTab = useUIStore(s => s.setSettingsTab);

  return (
    <Dialog isOpen={isOpen} onClose={closeSettings} title="Settings" size="full">
      <div className="flex gap-6 h-[70vh]">
        <nav className="flex flex-col gap-3 w-52 shrink-0 overflow-y-auto" aria-label="Settings sections">
          {ApplicationSections.length > 0 && (
            <div className="flex flex-col">
              <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Application
              </p>
              {ApplicationSections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setSettingsTab(section.id)}
                  aria-current={activeTab === section.id}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    activeTab === section.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {section.icon}
                  {section.label}
                </button>
              ))}
            </div>
          )}
          {WorkspaceSections.length > 0 && (
            <div className="flex flex-col">
              <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Workspace
              </p>
              {WorkspaceSections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setSettingsTab(section.id)}
                  aria-current={activeTab === section.id}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    activeTab === section.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {section.icon}
                  {section.label}
                </button>
              ))}
            </div>
          )}
        </nav>

        {activeTab === 'general' && (
          <div className="flex-1 min-w-0 flex min-h-0">
            <GeneralSettingsForm onSuccess={closeSettings} onCancel={closeSettings} />
          </div>
        )}

        {activeTab === 'graphql-schemas' && (
          <div className="flex-1 min-w-0 flex min-h-0">
            <GraphQLSchemasSettings />
          </div>
        )}

        {activeTab === 'oauth-configs' && (
          <div className="flex-1 min-w-0 flex min-h-0">
            <OAuthManagerContent active={isOpen} />
          </div>
        )}
      </div>
    </Dialog>
  );
}
