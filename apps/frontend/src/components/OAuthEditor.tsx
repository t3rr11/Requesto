import { useState, useEffect } from 'react';
import { Plus, Key, RefreshCw, LogOut, Settings, AlertCircle, CheckCircle, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import type { OAuthConfig, OAuthAuth } from '../store/oauth/types';
import { useOAuthStore } from '../store/oauth/store';
import { useOAuthFlow } from '../hooks/useOAuthFlow';
import { OAuthConfigForm } from '../forms/OAuthConfigForm';
import { OAuthManagerDialog } from '../forms/OAuthManagerDialog';
import { Button } from './Button';
import { formatTimeUntilExpiry, getSecondsUntil } from '../helpers/oauth/expiry';
import { revokeOAuthToken } from '../helpers/oauth/oauthFlowHandler';

interface OAuthEditorProps {
  auth: OAuthAuth | undefined;
  onAuthChange: (auth: OAuthAuth) => void;
  disabled?: boolean;
}

export function OAuthEditor({ auth, onAuthChange, disabled = false }: OAuthEditorProps) {
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showManagerDialog, setShowManagerDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<OAuthConfig | undefined>(undefined);
  const selectedConfigId = auth?.configId ?? '';

  const {
    configs,
    tokenStatuses,
    isLoadingConfigs,
    loadConfigs,
    addConfig,
    updateConfig,
    deleteConfig,
    clearTokens,
    loadTokenStatus,
  } = useOAuthStore();

  const { authenticate, refresh, isAuthenticating, error, clearError } = useOAuthFlow(selectedConfigId);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);


  useEffect(() => {
    if (selectedConfigId) loadTokenStatus(selectedConfigId);
  }, [selectedConfigId, loadTokenStatus]);

  const emitConfigId = (configId: string) => {
    if (configId === (auth?.configId ?? '')) return;
    onAuthChange({ configId });
  };

  const handleConfigSelect = (configId: string) => {
    clearError();
    emitConfigId(configId);
  };

  const handleSaveConfig = async (configData: Omit<OAuthConfig, 'id'> & { clientSecret?: string }) => {
    if (editingConfig) {
      await updateConfig(editingConfig.id, configData);
      setEditingConfig(undefined);
    } else {
      const newConfig = await addConfig(configData);
      emitConfigId(newConfig.id);
    }
  };

  const handleAuthenticate = async () => {
    const config = configs.find(c => c.id === selectedConfigId);
    if (!config) return;
    await authenticate(config);
  };

  const handleRefresh = async () => {
    if (!selectedConfigId) return;
    await refresh(selectedConfigId);
  };

  const handleLogout = async () => {
    if (!selectedConfigId) return;
    await clearTokens(selectedConfigId);
    clearError();
  };

  const handleRevoke = async () => {
    if (!selectedConfigId) return;
    const config = configs.find(c => c.id === selectedConfigId);
    if (!config?.revocationUrl) {
      await clearTokens(selectedConfigId);
      clearError();
      return;
    }
    try {
      await revokeOAuthToken(selectedConfigId, 'access_token');
      if (status?.hasRefreshToken) {
        await revokeOAuthToken(selectedConfigId, 'refresh_token');
      }
    } catch {
      // Still clear locally even if revocation fails
    }
    await clearTokens(selectedConfigId);
    clearError();
  };

  const handleDeleteConfig = async (configId: string) => {
    await deleteConfig(configId);
    if (selectedConfigId === configId) emitConfigId('');
  };

  const handleRemoveAuth = () => {
    clearError();
    emitConfigId('');
  };

  const selectedConfig = configs.find(c => c.id === selectedConfigId);
  const status = selectedConfigId ? tokenStatuses[selectedConfigId] : undefined;
  const isAuthenticated = !!status?.hasToken && !status.isExpired;
  const hasRefreshToken = !!status?.hasRefreshToken;
  const expiresAt = status?.expiresAt;

  const getTokenStatusKind = (): 'good' | 'warning' | 'expired' | 'none' => {
    if (!status?.hasToken) return 'none';
    const seconds = getSecondsUntil(expiresAt);
    if (seconds === null) return 'good';
    if (seconds <= 0) return 'expired';
    if (seconds <= 300) return 'warning';
    return 'good';
  };

  const tokenStatusKind = getTokenStatusKind();

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
        OAuth 2.0 authentication allows secure access to APIs without exposing credentials.
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            OAuth Configuration
          </label>
          <div className="flex items-center gap-1">
            {!selectedConfigId && (
              <Button type="button" onClick={() => setShowConfigForm(true)} variant="ghost" size="sm" disabled={disabled || isAuthenticating} className="gap-1">
                <Plus size={14} />
                New
              </Button>
            )}
            <Button type="button" onClick={() => setShowManagerDialog(true)} variant="ghost" size="sm" disabled={disabled || isAuthenticating} className="gap-1" title="Manage OAuth Configurations">
              <Settings size={14} />
              Manage
            </Button>
          </div>
        </div>

        {isLoadingConfigs ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading configurations...</div>
        ) : configs.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">No OAuth configurations yet. Create one to get started.</div>
        ) : (
          <div className="space-y-2">
            <select
              value={selectedConfigId}
              onChange={e => handleConfigSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
              disabled={disabled || isAuthenticating}
            >
              <option value="">Select a configuration...</option>
              {configs.map(config => (
                <option key={config.id} value={config.id}>
                  {config.name} ({config.provider})
                </option>
              ))}
            </select>
            {selectedConfigId && (
              <Button type="button" onClick={handleRemoveAuth} variant="ghost" size="sm" className="text-xs h-auto py-1 px-2" disabled={disabled || isAuthenticating}>
                Remove authentication from this request
              </Button>
            )}
          </div>
        )}
      </div>

      {selectedConfig && (
        <div className="border border-gray-300 dark:border-gray-600 rounded-md p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedConfig.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Provider: {selectedConfig.provider} | Flow: {selectedConfig.flowType}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Scopes: {selectedConfig.scopes.join(', ')}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => { setEditingConfig(selectedConfig); setShowConfigForm(true); }}
              variant="icon"
              size="sm"
              className="p-1.5"
              title="Edit configuration"
              disabled={disabled || isAuthenticating}
            >
              <Settings size={16} />
            </Button>
          </div>

          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            {isAuthenticated ? (
              <div className="space-y-2">
                <div className={`flex items-center gap-2 text-sm ${
                  tokenStatusKind === 'good' ? 'text-green-600 dark:text-green-400' :
                  tokenStatusKind === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-red-600 dark:text-red-400'
                }`}>
                  {tokenStatusKind === 'good' && <CheckCircle size={16} />}
                  {tokenStatusKind === 'warning' && <AlertTriangle size={16} />}
                  {tokenStatusKind === 'expired' && <AlertCircle size={16} />}
                  <span className="font-medium">
                    {tokenStatusKind === 'good' && 'Authenticated'}
                    {tokenStatusKind === 'warning' && 'Token Expiring Soon'}
                    {tokenStatusKind === 'expired' && 'Token Expired'}
                  </span>
                </div>

                {expiresAt !== undefined && (
                  <div className={`flex items-center gap-2 text-xs ${
                    tokenStatusKind === 'good' ? 'text-gray-600 dark:text-gray-400' :
                    tokenStatusKind === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    <Clock size={14} />
                    <span>{tokenStatusKind === 'expired' ? 'Expired' : `Expires ${formatTimeUntilExpiry(expiresAt)}`}</span>
                  </div>
                )}

                {selectedConfig.autoRefreshToken && hasRefreshToken && (
                  <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                    <RefreshCw size={14} />
                    <span>Auto-refresh enabled</span>
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  {hasRefreshToken && (
                    <Button type="button" onClick={handleRefresh} disabled={disabled || isAuthenticating} variant="primary" size="sm" className="gap-1.5">
                      <RefreshCw size={14} /> Refresh Token
                    </Button>
                  )}
                  {selectedConfig.revocationUrl && (
                    <Button type="button" onClick={handleRevoke} disabled={disabled || isAuthenticating} variant="danger" size="sm" className="gap-1.5">
                      <Trash2 size={14} /> Revoke
                    </Button>
                  )}
                  <Button type="button" onClick={handleLogout} disabled={disabled || isAuthenticating} variant="secondary" size="sm" className="gap-1.5">
                    <LogOut size={14} /> Clear
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                  <Key size={16} />
                  <span>Not authenticated</span>
                </div>
                <Button type="button" onClick={handleAuthenticate} disabled={disabled || isAuthenticating} variant="primary" className="gap-2">
                  <Key size={16} />
                  {isAuthenticating ? 'Authenticating...' : 'Authenticate'}
                </Button>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Authentication Error</p>
                <p className="text-xs mt-1 whitespace-pre-wrap wrap-break-word">{error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <OAuthConfigForm
        isOpen={showConfigForm}
        onClose={() => { setShowConfigForm(false); setEditingConfig(undefined); }}
        onSave={handleSaveConfig}
        onDelete={handleDeleteConfig}
        editConfig={editingConfig}
      />

      <OAuthManagerDialog isOpen={showManagerDialog} onClose={() => setShowManagerDialog(false)} />
    </div>
  );
}
