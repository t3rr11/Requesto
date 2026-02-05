/**
 * OAuth Editor Component
 * Main UI for managing OAuth authentication
 */

import { useState, useEffect, useRef } from 'react';
import { Plus, Key, RefreshCw, LogOut, Settings, AlertCircle, CheckCircle, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import { OAuthConfig, OAuthAuth } from '../types';
import { useOAuthStore } from '../store/oauth';
import { useOAuthFlow } from '../hooks/useOAuthFlow';
import { useTokenRefresh } from '../hooks/useTokenRefresh';
import { OAuthConfigForm } from '../forms/OAuthConfigForm';
import { Button } from './Button';
import { formatTimeUntilExpiry, getTimeUntilExpiry } from '../helpers/oauth/tokenManager';
import { revokeOAuthToken } from '../helpers/oauth/oauthFlowHandler';

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
  
  // Enable automatic token refresh for the selected config
  useTokenRefresh({
    configId: selectedConfigId,
    enabled: !!selectedConfigId,
    onRefresh: (configId) => {
      console.log(`[OAuth] Token auto-refreshed for config: ${configId}`);
    },
    onRefreshError: (configId, error) => {
      console.error(`[OAuth] Auto-refresh failed for config ${configId}:`, error.message);
    },
  });

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

  const handleRevoke = async () => {
    if (!selectedConfigId || !tokens) return;
    
    const config = configs.find(c => c.id === selectedConfigId);
    if (!config || !config.revocationUrl) {
      // Provider doesn't support revocation, just clear tokens locally
      clearTokens(selectedConfigId);
      clearError();
      return;
    }
    
    try {
      // Revoke the access token
      await revokeOAuthToken(selectedConfigId, tokens.accessToken, 'access_token');
      
      // If there's a refresh token, revoke it too
      if (tokens.refreshToken) {
        await revokeOAuthToken(selectedConfigId, tokens.refreshToken, 'refresh_token');
      }
      
      // Clear tokens locally after successful revocation
      clearTokens(selectedConfigId);
      clearError();
    } catch (error) {
      console.error('Failed to revoke token:', error);
      // Still clear tokens locally even if revocation fails
      clearTokens(selectedConfigId);
    }
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
  
  /**
   * Get token status for visual indicators
   * @returns 'good' | 'warning' | 'expired' | 'none'
   */
  const getTokenStatus = (): 'good' | 'warning' | 'expired' | 'none' => {
    if (!tokens) return 'none';
    
    const secondsUntilExpiry = getTimeUntilExpiry(tokens);
    if (secondsUntilExpiry === null) return 'good'; // No expiry info
    if (secondsUntilExpiry <= 0) return 'expired';
    if (secondsUntilExpiry <= 300) return 'warning'; // Less than 5 minutes
    return 'good';
  };
  
  const tokenStatus = getTokenStatus();

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
            <Button
              type="button"
              onClick={() => setShowConfigForm(true)}
              variant="ghost"
              size="sm"
              disabled={disabled || isAuthenticating}
              className="gap-1"
            >
              <Plus size={14} />
              New
            </Button>
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
              <Button
                type="button"
                onClick={handleRemoveAuth}
                variant="ghost"
                size="sm"
                className="text-xs h-auto py-1 px-2"
                disabled={disabled || isAuthenticating}
              >
                Remove authentication from this request
              </Button>
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
              <Button
                type="button"
                onClick={() => handleEditConfig(selectedConfig)}
                variant="icon"
                size="sm"
                className="p-1.5"
                title="Edit configuration"
                disabled={disabled || isAuthenticating}
              >
                <Settings size={16} />
              </Button>
            </div>
          </div>

          {/* Authentication Status */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            {isAuthenticated ? (
              <div className="space-y-2">
                {/* Status indicator with color coding */}
                <div className={`flex items-center gap-2 text-sm ${
                  tokenStatus === 'good' ? 'text-green-600 dark:text-green-400' :
                  tokenStatus === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-red-600 dark:text-red-400'
                }`}>
                  {tokenStatus === 'good' && <CheckCircle size={16} />}
                  {tokenStatus === 'warning' && <AlertTriangle size={16} />}
                  {tokenStatus === 'expired' && <AlertCircle size={16} />}
                  <span className="font-medium">
                    {tokenStatus === 'good' && 'Authenticated'}
                    {tokenStatus === 'warning' && 'Token Expiring Soon'}
                    {tokenStatus === 'expired' && 'Token Expired'}
                  </span>
                </div>
                
                {/* Expiry countdown */}
                {expiresIn !== null && (
                  <div className={`flex items-center gap-2 text-xs ${
                    tokenStatus === 'good' ? 'text-gray-600 dark:text-gray-400' :
                    tokenStatus === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    <Clock size={14} />
                    <span>
                      {tokenStatus === 'expired' ? 'Expired' : `Expires in ${formatTimeUntilExpiry(tokens!)}`}
                    </span>
                  </div>
                )}
                
                {/* Auto-refresh indicator */}
                {selectedConfig.autoRefreshToken && hasRefreshToken && (
                  <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                    <RefreshCw size={14} />
                    <span>Auto-refresh enabled (threshold: {selectedConfig.tokenRefreshThreshold || 300}s)</span>
                  </div>
                )}
                
                <div className="flex gap-2 mt-3">
                  {hasRefreshToken && (
                    <Button
                      type="button"
                      onClick={handleRefresh}
                      disabled={disabled || isAuthenticating}
                      variant="primary"
                      size="sm"
                      title="Manually refresh the access token"
                      className="gap-1.5"
                    >
                      <RefreshCw size={14} />
                      Refresh Token
                    </Button>
                  )}
                  
                  {selectedConfig.revocationUrl && (
                    <Button
                      type="button"
                      onClick={handleRevoke}
                      disabled={disabled || isAuthenticating}
                      variant="danger"
                      size="sm"
                      title="Revoke token on provider and clear locally"
                      className="gap-1.5"
                    >
                      <Trash2 size={14} />
                      Revoke
                    </Button>
                  )}
                  
                  <Button
                    type="button"
                    onClick={handleLogout}
                    disabled={disabled || isAuthenticating}
                    variant="secondary"
                    size="sm"
                    title="Clear stored tokens (local only)"
                    className="gap-1.5"
                  >
                    <LogOut size={14} />
                    Clear
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                  <Key size={16} />
                  <span>Not authenticated</span>
                </div>
                
                <Button
                  type="button"
                  onClick={handleAuthenticate}
                  disabled={disabled || isAuthenticating}
                  variant="primary"
                  className="gap-2"
                >
                  <Key size={16} />
                  {isAuthenticating ? 'Authenticating...' : 'Authenticate'}
                </Button>
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
