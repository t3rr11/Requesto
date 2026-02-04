/**
 * OAuth Configuration Form
 * Form for creating or editing OAuth configurations
 */

import { useState, FormEvent, useEffect } from 'react';
import { Eye, EyeOff, Info } from 'lucide-react';
import { Dialog } from '../components/Dialog';
import { OAuthConfig, OAuthFlowType, OAuthTokenStorage } from '../types';
import {
  getAllProviderTemplates,
  getProviderTemplate,
  substituteUrlPlaceholders,
  extractUrlPlaceholders,
  OAuthProviderTemplate,
} from '../helpers/oauth/providers';

interface OAuthConfigFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: Omit<OAuthConfig, 'id' | 'createdAt' | 'updatedAt'> & { clientSecret?: string }) => Promise<void>;
  onDelete?: (configId: string) => Promise<void>; // Optional delete handler for edit mode
  editConfig?: OAuthConfig; // If provided, we're editing
}

export function OAuthConfigForm({ isOpen, onClose, onSave, onDelete, editConfig }: OAuthConfigFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showClientSecret, setShowClientSecret] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('custom');
  const [selectedTemplate, setSelectedTemplate] = useState<OAuthProviderTemplate | null>(null);
  
  // OAuth configuration
  const [authorizationUrl, setAuthorizationUrl] = useState('');
  const [tokenUrl, setTokenUrl] = useState('');
  const [revocationUrl, setRevocationUrl] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [flowType, setFlowType] = useState<OAuthFlowType>('authorization-code-pkce');
  const [usePKCE, setUsePKCE] = useState(true);
  const [scopes, setScopes] = useState('');
  const [redirectUri, setRedirectUri] = useState('');
  
  // Advanced options
  const [tokenStorage, setTokenStorage] = useState<OAuthTokenStorage>('session');
  const [usePopup, setUsePopup] = useState(true);
  const [autoRefreshToken, setAutoRefreshToken] = useState(true);
  const [tokenRefreshThreshold, setTokenRefreshThreshold] = useState(300);
  
  // Placeholder substitutions
  const [placeholders, setPlaceholders] = useState<Record<string, string>>({});
  
  const providerTemplates = getAllProviderTemplates();

  // Load edit config or apply template
  useEffect(() => {
    if (editConfig) {
      setName(editConfig.name);
      setSelectedProvider(editConfig.provider);
      setAuthorizationUrl(editConfig.authorizationUrl);
      setTokenUrl(editConfig.tokenUrl);
      setRevocationUrl(editConfig.revocationUrl || '');
      setClientId(editConfig.clientId);
      setFlowType(editConfig.flowType);
      setUsePKCE(editConfig.usePKCE);
      setScopes(editConfig.scopes.join(' '));
      setRedirectUri(editConfig.redirectUri || '');
      setTokenStorage(editConfig.tokenStorage);
      setUsePopup(editConfig.usePopup);
      setAutoRefreshToken(editConfig.autoRefreshToken);
      setTokenRefreshThreshold(editConfig.tokenRefreshThreshold);
    } else if (selectedProvider !== 'custom') {
      const template = getProviderTemplate(selectedProvider);
      if (template) {
        setSelectedTemplate(template);
        applyTemplate(template);
      }
    }
  }, [editConfig, selectedProvider]);

  const applyTemplate = (template: OAuthProviderTemplate) => {
    setAuthorizationUrl(template.authorizationUrl);
    setTokenUrl(template.tokenUrl);
    setRevocationUrl(template.revocationUrl || '');
    setFlowType(template.flowType);
    setUsePKCE(template.usePKCE);
    setScopes(template.defaultScopes.join(' '));
    
    // Extract placeholders
    const authPlaceholders = extractUrlPlaceholders(template.authorizationUrl);
    const tokenPlaceholders = extractUrlPlaceholders(template.tokenUrl);
    const allPlaceholders = [...new Set([...authPlaceholders, ...tokenPlaceholders])];
    
    if (allPlaceholders.length > 0) {
      const newPlaceholders: Record<string, string> = {};
      allPlaceholders.forEach(p => {
        newPlaceholders[p] = '';
      });
      setPlaceholders(newPlaceholders);
    }
  };

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    if (provider === 'custom') {
      setSelectedTemplate(null);
      setAuthorizationUrl('');
      setTokenUrl('');
      setRevocationUrl('');
      setScopes('');
      setPlaceholders({});
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!name.trim()) {
      setError('Configuration name is required');
      return;
    }
    
    if (!clientId.trim()) {
      setError('Client ID is required');
      return;
    }

    // Substitute placeholders in URLs
    let finalAuthUrl = authorizationUrl;
    let finalTokenUrl = tokenUrl;
    let finalRevocationUrl = revocationUrl;
    
    if (Object.keys(placeholders).length > 0) {
      const missingPlaceholders = Object.entries(placeholders).filter(([_, v]) => !v.trim());
      if (missingPlaceholders.length > 0) {
        setError(`Please fill in all placeholders: ${missingPlaceholders.map(([k]) => k).join(', ')}`);
        return;
      }
      
      finalAuthUrl = substituteUrlPlaceholders(authorizationUrl, placeholders);
      finalTokenUrl = substituteUrlPlaceholders(tokenUrl, placeholders);
      if (revocationUrl) {
        finalRevocationUrl = substituteUrlPlaceholders(revocationUrl, placeholders);
      }
    }

    const config: Omit<OAuthConfig, 'id' | 'createdAt' | 'updatedAt'> & { clientSecret?: string } = {
      name: name.trim(),
      provider: selectedProvider,
      authorizationUrl: finalAuthUrl,
      tokenUrl: finalTokenUrl,
      revocationUrl: finalRevocationUrl || undefined,
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim() || undefined, // Include secret if provided
      flowType,
      usePKCE,
      scopes: scopes.split(/\s+/).filter(s => s.length > 0),
      redirectUri: redirectUri.trim() || undefined,
      tokenStorage,
      usePopup,
      autoRefreshToken,
      tokenRefreshThreshold,
      additionalParams: selectedTemplate?.additionalParams,
    };

    setLoading(true);
    try {
      await onSave(config);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setSelectedProvider('custom');
    setSelectedTemplate(null);
    setAuthorizationUrl('');
    setTokenUrl('');
    setRevocationUrl('');
    setClientId('');
    setClientSecret('');
    setFlowType('authorization-code-pkce');
    setUsePKCE(true);
    setScopes('');
    setRedirectUri('');
    setTokenStorage('session');
    setUsePopup(true);
    setAutoRefreshToken(true);
    setTokenRefreshThreshold(300);
    setPlaceholders({});
    setError('');
    onClose();
  };

  return (
    <Dialog 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={editConfig ? 'Edit OAuth Configuration' : 'New OAuth Configuration'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        {/* Configuration Name */}
        <div>
          <label htmlFor="config-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Configuration Name <span className="text-red-500">*</span>
          </label>
          <input
            id="config-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Production Microsoft, Dev GitHub"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            autoFocus
          />
        </div>

        {/* Provider Selection */}
        {!editConfig && (
          <div>
            <label htmlFor="provider" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              OAuth Provider
            </label>
            <select
              id="provider"
              value={selectedProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="custom">Custom Provider</option>
              {providerTemplates.map(template => (
                <option key={template.provider} value={template.provider}>
                  {template.displayName}
                </option>
              ))}
            </select>
            
            {selectedTemplate && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded text-sm">
                <div className="flex items-start gap-2">
                  <Info size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-blue-800 dark:text-blue-300">
                    <p className="font-medium mb-1">{selectedTemplate.displayName}</p>
                    <p className="text-xs whitespace-pre-line">{selectedTemplate.notes}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Placeholders (if any) */}
        {Object.keys(placeholders).length > 0 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Provider Configuration
            </label>
            {Object.keys(placeholders).map(placeholder => (
              <div key={placeholder}>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {placeholder} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={placeholders[placeholder]}
                  onChange={(e) => setPlaceholders({ ...placeholders, [placeholder]: e.target.value })}
                  placeholder={`Enter ${placeholder}`}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>
            ))}
          </div>
        )}

        {/* Client Credentials */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="client-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Client ID <span className="text-red-500">*</span>
            </label>
            <input
              id="client-id"
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Your OAuth client ID"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="client-secret" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Client Secret
            </label>
            <div className="relative">
              <input
                id="client-secret"
                type={showClientSecret ? 'text' : 'password'}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Optional (for confidential clients)"
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowClientSecret(!showClientSecret)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showClientSecret ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* OAuth Endpoints (show for custom or after template) */}
        {(selectedProvider === 'custom' || authorizationUrl) && (
          <div className="space-y-3">
            <div>
              <label htmlFor="auth-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Authorization URL <span className="text-red-500">*</span>
              </label>
              <input
                id="auth-url"
                type="url"
                value={authorizationUrl}
                onChange={(e) => setAuthorizationUrl(e.target.value)}
                placeholder="https://provider.com/oauth2/authorize"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-xs"
              />
            </div>
            
            <div>
              <label htmlFor="token-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Token URL <span className="text-red-500">*</span>
              </label>
              <input
                id="token-url"
                type="url"
                value={tokenUrl}
                onChange={(e) => setTokenUrl(e.target.value)}
                placeholder="https://provider.com/oauth2/token"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-xs"
              />
            </div>
            
            <div>
              <label htmlFor="revocation-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Revocation URL (optional)
              </label>
              <input
                id="revocation-url"
                type="url"
                value={revocationUrl}
                onChange={(e) => setRevocationUrl(e.target.value)}
                placeholder="https://provider.com/oauth2/revoke"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-xs"
              />
            </div>
          </div>
        )}

        {/* Scopes */}
        <div>
          <label htmlFor="scopes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Scopes
          </label>
          <input
            id="scopes"
            type="text"
            value={scopes}
            onChange={(e) => setScopes(e.target.value)}
            placeholder="openid profile email"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {selectedTemplate?.scopeDescription || 'Space-separated list of OAuth scopes'}
          </p>
        </div>

        {/* Flow Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="flow-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Flow Type
            </label>
            <select
              id="flow-type"
              value={flowType}
              onChange={(e) => {
                const newFlowType = e.target.value as OAuthFlowType;
                setFlowType(newFlowType);
                setUsePKCE(newFlowType === 'authorization-code-pkce');
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            >
              <option value="authorization-code-pkce">Authorization Code (PKCE)</option>
              <option value="authorization-code">Authorization Code</option>
              <option value="implicit">Implicit (deprecated)</option>
              <option value="client-credentials">Client Credentials</option>
              <option value="password">Password (not recommended)</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="token-storage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Token Storage
            </label>
            <select
              id="token-storage"
              value={tokenStorage}
              onChange={(e) => setTokenStorage(e.target.value as OAuthTokenStorage)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            >
              <option value="memory">Memory (most secure)</option>
              <option value="session">Session (balanced)</option>
              <option value="local">Local Storage (persistent)</option>
            </select>
          </div>
        </div>

        {/* Security Warnings */}
        {flowType === 'implicit' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-400 px-3 py-2 rounded text-sm flex items-start gap-2">
            <Info size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">⚠️ Implicit Flow is Deprecated</p>
              <p className="text-xs mt-1">
                This flow exposes access tokens in the URL fragment (browser history, referrer headers). 
                Use Authorization Code with PKCE instead for better security.
              </p>
            </div>
          </div>
        )}

        {flowType === 'password' && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-3 py-2 rounded text-sm flex items-start gap-2">
            <Info size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">⚠️ Password Flow is Not Recommended</p>
              <p className="text-xs mt-1">
                This flow exposes user credentials to your application. Only use when absolutely necessary 
                and with trusted first-party applications. Consider Authorization Code with PKCE instead.
              </p>
            </div>
          </div>
        )}

        {flowType === 'client-credentials' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-400 px-3 py-2 rounded text-sm flex items-start gap-2">
            <Info size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">ℹ️ Machine-to-Machine Authentication</p>
              <p className="text-xs mt-1">
                Client Credentials flow is for server-to-server communication without user interaction. 
                Requires client secret. No user consent or redirect needed.
              </p>
            </div>
          </div>
        )}

        {/* Advanced Options */}
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={usePopup}
              onChange={(e) => setUsePopup(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Use popup window (vs full redirect)</span>
          </label>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefreshToken}
              onChange={(e) => setAutoRefreshToken(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Automatically refresh tokens</span>
          </label>
        </div>

        {/* Form Actions */}
        <div className="flex justify-between gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          {editConfig && onDelete ? (
            <button
              type="button"
              onClick={async () => {
                if (confirm('Are you sure you want to delete this OAuth configuration? This cannot be undone.')) {
                  setLoading(true);
                  try {
                    await onDelete(editConfig.id);
                    handleClose();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to delete configuration');
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
              disabled={loading}
            >
              Delete Configuration
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (editConfig ? 'Save Changes' : 'Create Configuration')}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
