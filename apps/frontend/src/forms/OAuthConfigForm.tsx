/**
 * OAuth Configuration Form
 * Form for creating or editing OAuth configurations with tabbed interface
 */

import { useState, FormEvent, useEffect } from 'react';
import { Eye, EyeOff, Info } from 'lucide-react';
import { Dialog } from '../components/Dialog';
import { Button } from '../components/Button';
import { OAuthConfig, OAuthFlowType, OAuthTokenStorage } from '../types';
import {
  getAllProviderTemplates,
  getProviderTemplate,
  substituteUrlPlaceholders,
  extractUrlPlaceholders,
  OAuthProviderTemplate,
} from '../helpers/oauth/providers';

type FormTab = 'basic' | 'endpoints' | 'security' | 'advanced';

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
  const [activeTab, setActiveTab] = useState<FormTab>('basic');
  
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
    setActiveTab('basic');
    onClose();
  };

  const tabs: { id: FormTab; label: string; badge?: boolean }[] = [
    { id: 'basic', label: 'Basic', badge: false },
    { id: 'endpoints', label: 'Endpoints', badge: selectedProvider === 'custom' || !!authorizationUrl },
    { id: 'security', label: 'Security', badge: flowType === 'implicit' || flowType === 'password' },
    { id: 'advanced', label: 'Advanced', badge: false },
  ];

  return (
    <Dialog 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={editConfig ? 'Edit OAuth Configuration' : 'New OAuth Configuration'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm mb-4">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 -mx-6 px-6">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              variant="ghost"
              size="md"
              className={`
                px-4 py-2 text-sm font-medium border-b-2 rounded-none relative !ring-0
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              {tab.label}
              {tab.badge && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
              )}
            </Button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-4 min-h-[400px]">
          {/* BASIC TAB */}
          {activeTab === 'basic' && (
            <>
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
              <div className="space-y-3">
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
                    <Button
                      type="button"
                      onClick={() => setShowClientSecret(!showClientSecret)}
                      variant="icon"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showClientSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Required for client credentials and password flows
                  </p>
                </div>
              </div>

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
            </>
          )}

          {/* ENDPOINTS TAB */}
          {activeTab === 'endpoints' && (
            <>
              <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-sm text-gray-600 dark:text-gray-400">
                <Info size={16} className="inline mr-2" />
                {selectedProvider !== 'custom' 
                  ? 'These endpoints are pre-configured for the selected provider. You can customize them if needed.'
                  : 'Enter the OAuth endpoint URLs provided by your custom OAuth provider.'}
              </div>

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
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Where users are redirected to authorize your application
                </p>
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
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Endpoint to exchange authorization codes for access tokens
                </p>
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
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Endpoint to revoke access tokens (enables logout functionality)
                </p>
              </div>

              <div>
                <label htmlFor="redirect-uri" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Redirect URI (optional)
                </label>
                <input
                  id="redirect-uri"
                  type="url"
                  value={redirectUri}
                  onChange={(e) => setRedirectUri(e.target.value)}
                  placeholder="Auto-detected from current URL"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-xs"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Leave blank to auto-detect. Override if using a custom callback URL.
                </p>
              </div>
            </>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <>
              <div>
                <label htmlFor="flow-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  OAuth Flow Type
                </label>
                <select
                  id="flow-type"
                  value={flowType}
                  onChange={(e) => {
                    const newFlowType = e.target.value as OAuthFlowType;
                    setFlowType(newFlowType);
                    setUsePKCE(newFlowType === 'authorization-code-pkce');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="authorization-code-pkce">Authorization Code with PKCE (Recommended)</option>
                  <option value="authorization-code">Authorization Code</option>
                  <option value="client-credentials">Client Credentials</option>
                  <option value="implicit">Implicit (Deprecated)</option>
                  <option value="password">Password (Not Recommended)</option>
                </select>
              </div>

              {/* Flow-specific warnings */}
              {flowType === 'authorization-code-pkce' && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-400 px-3 py-2 rounded text-sm flex items-start gap-2">
                  <Info size={16} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">✓ Recommended Flow</p>
                    <p className="text-xs mt-1">
                      PKCE (RFC 7636) provides additional security for public clients by preventing authorization code interception attacks.
                    </p>
                  </div>
                </div>
              )}

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

              <div>
                <label htmlFor="token-storage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Token Storage
                </label>
                <select
                  id="token-storage"
                  value={tokenStorage}
                  onChange={(e) => setTokenStorage(e.target.value as OAuthTokenStorage)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="memory">Memory (Most Secure - Lost on refresh)</option>
                  <option value="session">Session Storage (Balanced - Lost on tab close)</option>
                  <option value="local">Local Storage (Persistent - Survives restarts)</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {tokenStorage === 'memory' && 'Tokens stored in memory only. Most secure but tokens lost on page refresh.'}
                  {tokenStorage === 'session' && 'Tokens stored in session storage. Cleared when tab is closed.'}
                  {tokenStorage === 'local' && 'Tokens stored in local storage. Persists across browser restarts.'}
                </p>
              </div>
            </>
          )}

          {/* ADVANCED TAB */}
          {activeTab === 'advanced' && (
            <>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usePopup}
                    onChange={(e) => setUsePopup(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Use Popup Window</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Opens OAuth flow in a popup window instead of full page redirect. Better UX but requires popup blocker permissions.
                    </p>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRefreshToken}
                    onChange={(e) => setAutoRefreshToken(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Automatic Token Refresh</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Automatically refreshes access tokens before they expire (when refresh token is available).
                    </p>
                  </div>
                </label>
              </div>

              {autoRefreshToken && (
                <div>
                  <label htmlFor="refresh-threshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Refresh Threshold (seconds)
                  </label>
                  <input
                    id="refresh-threshold"
                    type="number"
                    min="60"
                    max="3600"
                    value={tokenRefreshThreshold}
                    onChange={(e) => setTokenRefreshThreshold(parseInt(e.target.value) || 300)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Refresh tokens this many seconds before expiry (default: 300 = 5 minutes)
                  </p>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Configuration Summary</h4>
                <dl className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Provider:</dt>
                    <dd className="text-gray-900 dark:text-gray-100 font-medium">{selectedTemplate?.displayName || 'Custom'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Flow Type:</dt>
                    <dd className="text-gray-900 dark:text-gray-100 font-medium">{flowType}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Token Storage:</dt>
                    <dd className="text-gray-900 dark:text-gray-100 font-medium">{tokenStorage}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Scopes:</dt>
                    <dd className="text-gray-900 dark:text-gray-100 font-medium">{scopes || 'None'}</dd>
                  </div>
                </dl>
              </div>
            </>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-between gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
          {editConfig && onDelete ? (
            <Button
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
              variant="danger"
              disabled={loading}
            >
              Delete Configuration
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleClose}
              variant="secondary"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
            >
              {loading ? 'Saving...' : (editConfig ? 'Save Changes' : 'Create Configuration')}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
