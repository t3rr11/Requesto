import { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Globe,
  Key,
  Lock,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Trash2,
  Pencil,
  ShieldCheck,
  ShieldAlert,
  Database,
  Settings,
} from 'lucide-react';
import { useOAuthStore } from '../store/oauth/store';
import { useAlertStore } from '../store/alert/store';
import { Dialog } from '../components/Dialog';
import { OAuthConfigList } from '../components/OAuthConfigList';
import { OAuthConfigForm } from './OAuthConfigForm';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useConfirmDialog, useDialog } from '../hooks/useDialog';
import { useOAuthFlow } from '../hooks/useOAuthFlow';
import { formatTimeUntilExpiry, getSecondsUntil } from '../helpers/oauth/expiry';
import type { OAuthConfig, OAuthFlowType } from '../store/oauth/types';

interface OAuthManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OAuthManagerDialog({ isOpen, onClose }: OAuthManagerDialogProps) {
  const {
    configs,
    tokenStatuses,
    isLoadingConfigs,
    loadConfigs,
    addConfig,
    updateConfig,
    deleteConfig,
    loadTokenStatus,
    clearTokens,
  } = useOAuthStore();
  const { showAlert } = useAlertStore();
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);

  const configFormDialog = useDialog();
  const confirmDialog = useConfirmDialog();
  const [editingConfig, setEditingConfig] = useState<OAuthConfig | undefined>();

  const selectedConfig = configs.find(c => c.id === selectedConfigId);
  const { authenticate, refresh, isAuthenticating, error: authError } = useOAuthFlow(selectedConfigId || undefined);

  useEffect(() => {
    if (isOpen) {
      loadConfigs();
    }
  }, [isOpen, loadConfigs]);

  // Pre-select the first config when configs load and nothing is selected
  useEffect(() => {
    if (isOpen && configs.length > 0 && !selectedConfigId) {
      setSelectedConfigId(configs[0].id);
    }
  }, [isOpen, configs, selectedConfigId]);

  useEffect(() => {
    if (selectedConfigId) {
      loadTokenStatus(selectedConfigId);
    }
  }, [selectedConfigId, loadTokenStatus]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedConfigId(null);
      setEditingConfig(undefined);
    }
  }, [isOpen]);

  const handleAddConfig = () => {
    setEditingConfig(undefined);
    configFormDialog.open();
  };

  const handleEditConfig = () => {
    setEditingConfig(selectedConfig);
    configFormDialog.open();
  };

  const handleSaveConfig = async (
    configData: Omit<OAuthConfig, 'id'> & { clientSecret?: string }
  ) => {
    try {
      if (editingConfig) {
        await updateConfig(editingConfig.id, configData);
        showAlert('Configuration updated', 'success');
      } else {
        const newConfig = await addConfig(configData);
        setSelectedConfigId(newConfig.id);
        showAlert('Configuration created', 'success');
      }
      configFormDialog.close();
    } catch {
      showAlert('Failed to save configuration', 'error');
    }
  };

  const handleDeleteConfig = () => {
    if (!selectedConfig) return;
    confirmDialog.open({
      title: 'Delete OAuth Configuration',
      message: `Are you sure you want to delete "${selectedConfig.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteConfig(selectedConfig.id);
          setSelectedConfigId(null);
          showAlert('Configuration deleted', 'success');
        } catch {
          showAlert('Failed to delete configuration', 'error');
        }
      },
    });
  };

  const handleAuthenticate = async () => {
    if (!selectedConfig) return;
    try {
      await authenticate(selectedConfig);
      showAlert('Authentication started', 'success');
    } catch {
      showAlert('Authentication failed', 'error');
    }
  };

  const handleRefresh = async () => {
    if (!selectedConfigId) return;
    try {
      await refresh(selectedConfigId);
      showAlert('Token refreshed', 'success');
    } catch {
      showAlert('Failed to refresh token', 'error');
    }
  };

  const currentStatus = selectedConfigId ? tokenStatuses[selectedConfigId] : undefined;
  const isAuthenticated = !!currentStatus?.hasToken;

  const flowTypeLabels: Record<OAuthFlowType, string> = {
    'authorization-code': 'Authorization Code',
    'authorization-code-pkce': 'Authorization Code + PKCE',
    implicit: 'Implicit',
    'client-credentials': 'Client Credentials',
    password: 'Password',
  };

  const storageLabels: Record<string, string> = {
    memory: 'In-Memory',
    session: 'Session Storage',
    local: 'Local Storage',
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showAlert(`${label} copied to clipboard`, 'success');
  };

  const tokenExpired = !!currentStatus?.isExpired;
  const tokenExpiringSoon = (() => {
    if (!currentStatus?.hasToken || tokenExpired) return false;
    const seconds = getSecondsUntil(currentStatus.expiresAt);
    if (seconds === null) return false;
    return seconds <= (selectedConfig?.tokenRefreshThreshold ?? 300);
  })();

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="OAuth 2.0 Configurations" size="full">
      <div className="flex h-[70vh] -m-6">
        <div className="shrink-0">
          <OAuthConfigList
            configs={configs}
            selectedConfigId={selectedConfigId}
            isLoadingConfigs={isLoadingConfigs}
            onConfigSelect={config => setSelectedConfigId(config.id)}
            onAdd={handleAddConfig}
          />
        </div>
        <div className="flex-1 overflow-hidden flex flex-col min-w-0 bg-gray-50 dark:bg-gray-900">
          {selectedConfig ? (
            <div className="flex-1 overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shrink-0">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {selectedConfig.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        {selectedConfig.provider && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            {selectedConfig.provider}
                          </span>
                        )}
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                          {flowTypeLabels[selectedConfig.flowType]}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button onClick={handleEditConfig} variant="secondary" size="sm">
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button onClick={handleDeleteConfig} variant="danger" size="sm">
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Token Status Card */}
                <div
                  className={`rounded-lg border p-4 ${
                    isAuthenticated
                      ? tokenExpired
                        ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30'
                        : tokenExpiringSoon
                          ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30'
                          : 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isAuthenticated ? (
                        tokenExpired ? (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        ) : tokenExpiringSoon ? (
                          <Clock className="w-5 h-5 text-amber-500" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )
                      ) : (
                        <ShieldAlert className="w-5 h-5 text-gray-400" />
                      )}
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            isAuthenticated
                              ? tokenExpired
                                ? 'text-red-700 dark:text-red-400'
                                : tokenExpiringSoon
                                  ? 'text-amber-700 dark:text-amber-400'
                                  : 'text-green-700 dark:text-green-400'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {isAuthenticated
                            ? tokenExpired
                              ? 'Token Expired'
                              : tokenExpiringSoon
                                ? 'Token Expiring Soon'
                                : 'Authenticated'
                            : 'Not Authenticated'}
                        </p>
                        {isAuthenticated && currentStatus && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {tokenExpired ? 'Token has expired' : `Expires ${formatTimeUntilExpiry(currentStatus.expiresAt)}`}
                            {currentStatus.tokenType && (
                              <span className="ml-2">
                                &middot; Type: <span className="font-medium">{currentStatus.tokenType}</span>
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAuthenticated ? (
                        <>
                          <Button onClick={handleRefresh} variant="secondary" size="sm">
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                            Refresh
                          </Button>
                          <Button
                            onClick={async () => {
                              await clearTokens(selectedConfigId!);
                              showAlert('Tokens cleared', 'success');
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            Clear
                          </Button>
                        </>
                      ) : (
                        <Button onClick={handleAuthenticate} variant="primary" size="sm" loading={isAuthenticating}>
                          <Key className="w-3.5 h-3.5 mr-1.5" />
                          Authenticate
                        </Button>
                      )}
                    </div>
                  </div>
                  {authError && (
                    <div className="mt-3 flex items-start gap-2 p-2.5 rounded-md bg-red-100 dark:bg-red-900/30">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-700 dark:text-red-400">{authError}</p>
                    </div>
                  )}

                  {/* Token details when authenticated. The backend is the sole
                      owner of token material; here we only show non-secret
                      metadata plus a redacted preview of the access token. */}
                  {isAuthenticated && currentStatus && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600/30 space-y-2">
                      {currentStatus.accessTokenPreview && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-24 shrink-0">Access Token</span>
                          <code className="text-xs font-mono text-gray-700 dark:text-gray-300 truncate flex-1 bg-gray-100 dark:bg-gray-700/50 px-2 py-1 rounded">
                            {currentStatus.accessTokenPreview}
                          </code>
                        </div>
                      )}
                      {currentStatus.hasRefreshToken && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-24 shrink-0">Refresh Token</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 italic">Stored on backend</span>
                        </div>
                      )}
                      {currentStatus.scope && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-24 shrink-0">Token Scope</span>
                          <span className="text-xs text-gray-700 dark:text-gray-300">{currentStatus.scope}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Endpoints Section */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Endpoints</h4>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {selectedConfig.authorizationUrl && (
                      <div className="px-4 py-3 flex items-start gap-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-32 shrink-0 pt-0.5">Authorization URL</span>
                        <code className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all flex-1">
                          {selectedConfig.authorizationUrl}
                        </code>
                        <a
                          href={selectedConfig.authorizationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                    {selectedConfig.tokenUrl && (
                      <div className="px-4 py-3 flex items-start gap-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-32 shrink-0 pt-0.5">Token URL</span>
                        <code className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all flex-1">
                          {selectedConfig.tokenUrl}
                        </code>
                        <a
                          href={selectedConfig.tokenUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                    {selectedConfig.revocationUrl && (
                      <div className="px-4 py-3 flex items-start gap-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-32 shrink-0 pt-0.5">Revocation URL</span>
                        <code className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all flex-1">
                          {selectedConfig.revocationUrl}
                        </code>
                      </div>
                    )}
                    {selectedConfig.redirectUri && (
                      <div className="px-4 py-3 flex items-start gap-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-32 shrink-0 pt-0.5">Redirect URI</span>
                        <code className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all flex-1">
                          {selectedConfig.redirectUri}
                        </code>
                        <button
                          onClick={() => copyToClipboard(selectedConfig.redirectUri!, 'Redirect URI')}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    {!selectedConfig.authorizationUrl && !selectedConfig.tokenUrl && !selectedConfig.redirectUri && (
                      <div className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500 italic">
                        No endpoints configured
                      </div>
                    )}
                  </div>
                </div>

                {/* Credentials & Scopes Section */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <Key className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Credentials & Scopes</h4>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    <div className="px-4 py-3 flex items-center gap-3 group">
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-32 shrink-0">Client ID</span>
                      <code className="text-xs font-mono text-gray-700 dark:text-gray-300 truncate flex-1">
                        {selectedConfig.clientId}
                      </code>
                      <button
                        onClick={() => copyToClipboard(selectedConfig.clientId, 'Client ID')}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="px-4 py-3 flex items-start gap-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-32 shrink-0 pt-0.5">Scopes</span>
                      {selectedConfig.scopes.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 flex-1">
                          {selectedConfig.scopes.map(scope => (
                            <span
                              key={scope}
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                            >
                              {scope}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                          No scopes configured
                        </span>
                      )}
                    </div>
                    {selectedConfig.additionalParams && Object.keys(selectedConfig.additionalParams).length > 0 && (
                      <div className="px-4 py-3 flex items-start gap-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-32 shrink-0 pt-0.5">Extra Params</span>
                        <div className="flex flex-wrap gap-1.5 flex-1">
                          {Object.entries(selectedConfig.additionalParams).map(([key, value]) => (
                            <span
                              key={key}
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                            >
                              {key}={value}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Security & Settings */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <Lock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Security</h4>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">PKCE</span>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                            selectedConfig.usePKCE
                              ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {selectedConfig.usePKCE ? (
                            <ShieldCheck className="w-3 h-3" />
                          ) : (
                            <ShieldAlert className="w-3 h-3" />
                          )}
                          {selectedConfig.usePKCE ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Flow Type</span>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {flowTypeLabels[selectedConfig.flowType]}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Popup Mode</span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            selectedConfig.usePopup
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {selectedConfig.usePopup ? 'Popup' : 'Redirect'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Settings</h4>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Token Storage</span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          <Database className="w-3 h-3" />
                          {storageLabels[selectedConfig.tokenStorage] || selectedConfig.tokenStorage}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Auto-Refresh</span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            selectedConfig.autoRefreshToken
                              ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {selectedConfig.autoRefreshToken ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      {selectedConfig.autoRefreshToken && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Refresh Threshold</span>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {selectedConfig.tokenRefreshThreshold}s before expiry
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Shield className="w-12 h-12" />}
              title="No configuration selected"
              description="Select a configuration from the sidebar or create a new one"
              action={{
                label: 'New Config',
                onClick: handleAddConfig,
                icon: <Plus className="w-4 h-4" />,
              }}
            />
          )}
        </div>
      </div>

      <OAuthConfigForm
        isOpen={configFormDialog.isOpen}
        onClose={configFormDialog.close}
        onSave={handleSaveConfig}
        editConfig={editingConfig}
        onDelete={
          editingConfig
            ? async () => {
                await deleteConfig(editingConfig.id);
                setSelectedConfigId(null);
                configFormDialog.close();
                showAlert('Configuration deleted', 'success');
              }
            : undefined
        }
      />

      <ConfirmDialog {...confirmDialog.props} />
    </Dialog>
  );
}
