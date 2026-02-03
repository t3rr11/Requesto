/**
 * OAuth Editor Component
 * Main UI for managing OAuth authentication
 */

import { useState, useEffect, useRef } from 'react';
import { Plus, Key, RefreshCw, LogOut, Settings, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { OAuthConfig, OAuthAuth } from '../types';
import { useOAuthStore } from '../store/useOAuthStore';
import { useOAuthFlow } from '../hooks/useOAuthFlow';
import { OAuthConfigForm } from '../forms/OAuthConfigForm';
import { formatTimeUntilExpiry } from '../helpers/oauth/tokenManager';

interface OAuthEditorProps {
  auth: OAuthAuth | undefined;
  onAuthChange: (auth: OAuthAuth) => void;
  disabled?: boolean;
}

export function OAuthEditor({ auth, onAuthChange, disabled = false }: OAuthEditorProps) {
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<OAuthConfig | undefined>(undefined);
  const [selectedConfigId, setSelectedConfigId] = useState<string>(auth?.configId || '');
  
  const { 
    configs, 
    tokenState, 
    loadConfigs, 
    addConfig, 
    updateConfig,
    deleteConfig,
    clearTokens,
    isLoadingConfigs,
  } = useOAuthStore();
  
  const { authenticate, refresh, isAuthenticating, error, clearError } = useOAuthFlow(selectedConfigId);

  // Load configs on mount
  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  // Update parent when config selection changes
  // Use ref to track previous auth state to prevent infinite loops
  const previousAuthRef = useRef<string>('');
  
  useEffect(() => {
    if (selectedConfigId && configs.length > 0) {
      const config = configs.find(c => c.id === selectedConfigId);
      if (config) {
        const tokens = tokenState[selectedConfigId]?.tokens;
        const isExpired = tokenState[selectedConfigId]?.isExpired ?? true;
        
        const newAuth: OAuthAuth = {
          configId: selectedConfigId,
          config,
          tokens: tokens || undefined,
          isAuthenticated: !!tokens && !isExpired,
          isRefreshing: false,
          error: error || undefined,
        };
        
        // Only call onAuthChange if the auth state actually changed
        const authString = JSON.stringify({
          configId: newAuth.configId,
          hasTokens: !!newAuth.tokens,
          isAuthenticated: newAuth.isAuthenticated,
          error: newAuth.error,
        });
        
        if (authString !== previousAuthRef.current) {
          previousAuthRef.current = authString;
          onAuthChange(newAuth);
        }
      }
    }
  }, [selectedConfigId, configs, tokenState, error]);

  const handleConfigSelect = (configId: string) => {
    setSelectedConfigId(configId);
    clearError();
  };

  const handleSaveConfig = async (configData: Omit<OAuthConfig, 'id' | 'createdAt' | 'updatedAt'> & { clientSecret?: string }) => {
    if (editingConfig) {
      // Update existing config
      await updateConfig(editingConfig.id, configData);
      setEditingConfig(undefined);
    } else {
      // Create new config
      const newConfig = await addConfig(configData);
      setSelectedConfigId(newConfig.id);
    }
  };

  const handleEditConfig = (config: OAuthConfig) => {
    setEditingConfig(config);
    setShowConfigForm(true);
  };

  const handleCloseConfigForm = () => {
    setShowConfigForm(false);
    setEditingConfig(undefined);
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

  const handleLogout = () => {
    if (!selectedConfigId) return;
    clearTokens(selectedConfigId);
    clearError();
  };

  const handleDeleteConfig = async (configId: string) => {
    await deleteConfig(configId);
    if (selectedConfigId === configId) {
      setSelectedConfigId('');
    }
  };

  const handleRemoveAuth = () => {
    setSelectedConfigId('');
    clearError();
    // Reset to no auth
    onAuthChange({
      configId: '',
      config: undefined,
      tokens: undefined,
      isAuthenticated: false,
      isRefreshing: false,
    });
  };

  const selectedConfig = configs.find(c => c.id === selectedConfigId);
  const tokens = selectedConfigId ? tokenState[selectedConfigId]?.tokens : null;
  const isExpired = selectedConfigId ? tokenState[selectedConfigId]?.isExpired : true;
  const expiresIn = selectedConfigId ? tokenState[selectedConfigId]?.expiresIn : null;
  const isAuthenticated = !!tokens && !isExpired;
  const hasRefreshToken = !!tokens?.refreshToken;

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
        OAuth 2.0 authentication allows secure access to APIs without exposing credentials. 
        Configure your OAuth provider below and authenticate to get access tokens.
      </div>

      {/* Config Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            OAuth Configuration
          </label>
          {!selectedConfigId && (
            <button
              type="button"
              onClick={() => setShowConfigForm(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
              disabled={disabled || isAuthenticating}
            >
              <Plus size={14} />
              New
            </button>
          )}
        </div>
        
        {isLoadingConfigs ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading configurations...</div>
        ) : configs.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            No OAuth configurations yet. Create one to get started.
          </div>
        ) : (
          <div className="space-y-2">
            <select
              value={selectedConfigId}
              onChange={(e) => handleConfigSelect(e.target.value)}
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
              <button
                type="button"
                onClick={handleRemoveAuth}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                disabled={disabled || isAuthenticating}
              >
                Remove authentication from this request
              </button>
            )}
          </div>
        )}
      </div>

      {/* Configuration Details & Status */}
      {selectedConfig && (
        <div className="border border-gray-300 dark:border-gray-600 rounded-md p-4 space-y-3">
          {/* Config Info with Actions */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {selectedConfig.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Provider: {selectedConfig.provider} | Flow: {selectedConfig.flowType}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Scopes: {selectedConfig.scopes.join(', ')}
              </p>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleEditConfig(selectedConfig)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                title="Edit configuration"
                disabled={disabled || isAuthenticating}
              >
                <Settings size={16} />
              </button>
            </div>
          </div>

          {/* Authentication Status */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            {isAuthenticated ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                  <CheckCircle size={16} />
                  <span className="font-medium">Authenticated</span>
                </div>
                
                {expiresIn !== null && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-xs">
                    <Clock size={14} />
                    <span>Expires {formatTimeUntilExpiry(tokens!)}</span>
                  </div>
                )}
                
                <div className="flex gap-2 mt-3">
                  {hasRefreshToken && selectedConfig.autoRefreshToken && (
                    <button
                      type="button"
                      onClick={handleRefresh}
                      disabled={disabled || isAuthenticating}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={14} />
                      Refresh Token
                    </button>
                  )}
                  
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={disabled || isAuthenticating}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs transition-colors"
                  >
                    <LogOut size={14} />
                    Clear Token
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                  <Key size={16} />
                  <span>Not authenticated</span>
                </div>
                
                <button
                  type="button"
                  onClick={handleAuthenticate}
                  disabled={disabled || isAuthenticating}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Key size={16} />
                  {isAuthenticating ? 'Authenticating...' : 'Authenticate'}
                </button>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Authentication Error</p>
                <p className="text-xs mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* OAuth Config Form Dialog */}
      <OAuthConfigForm
        isOpen={showConfigForm}
        onClose={handleCloseConfigForm}
        onSave={handleSaveConfig}
        onDelete={handleDeleteConfig}
        editConfig={editingConfig}
      />
    </div>
  );
}
