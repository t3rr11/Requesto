import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { VariableAwareInput } from './VariableAwareInput';
import { OAuthEditor } from './OAuthEditor';
import { AuthConfig, AuthType } from '../types';

interface AuthEditorProps {
  auth: AuthConfig;
  onAuthChange: (auth: AuthConfig) => void;
  disabled?: boolean;
}

export function AuthEditor({ auth, onAuthChange, disabled = false }: AuthEditorProps) {
  const [showPassword, setShowPassword] = useState(false);

  const handleTypeChange = (type: AuthType) => {
    onAuthChange({
      type,
      basic: type === 'basic' ? { username: '', password: '' } : undefined,
      bearer: type === 'bearer' ? { token: '' } : undefined,
      apiKey: type === 'api-key' ? { key: '', value: '', addTo: 'header' } : undefined,
      digest: type === 'digest' ? { username: '', password: '' } : undefined,
      oauth: type === 'oauth' ? undefined : undefined,
    });
  };

  const updateBasicAuth = (field: 'username' | 'password', value: string) => {
    if (!auth.basic) return;
    onAuthChange({
      ...auth,
      basic: { ...auth.basic, [field]: value },
    });
  };

  const updateBearerAuth = (value: string) => {
    onAuthChange({
      ...auth,
      bearer: { token: value },
    });
  };

  const updateApiKeyAuth = (field: 'key' | 'value' | 'addTo', value: string) => {
    if (!auth.apiKey) return;
    onAuthChange({
      ...auth,
      apiKey: { ...auth.apiKey, [field]: value },
    });
  };

  const updateDigestAuth = (field: 'username' | 'password', value: string) => {
    if (!auth.digest) return;
    onAuthChange({
      ...auth,
      digest: { ...auth.digest, [field]: value },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Authentication Type</label>
        <select
          value={auth.type}
          onChange={e => handleTypeChange(e.target.value as AuthType)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:bg-gray-800 dark:text-gray-200"
          disabled={disabled}
        >
          <option value="none">No Auth</option>
          <option value="basic">Basic Auth</option>
          <option value="bearer">Bearer Token</option>
          <option value="api-key">API Key</option>
          <option value="digest">Digest Auth</option>
          <option value="oauth">OAuth 2.0</option>
        </select>
      </div>

      {auth.type === 'basic' && auth.basic && (
        <div className="space-y-4 pt-2">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Basic authentication sends credentials as base64-encoded username:password in the Authorization header.
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
            <VariableAwareInput
              value={auth.basic.username}
              onChange={value => updateBasicAuth('username', value)}
              placeholder="Enter username"
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:bg-gray-800 dark:text-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <div className="relative">
              <VariableAwareInput
                value={auth.basic.password}
                onChange={value => updateBasicAuth('password', value)}
                placeholder="Enter password"
                disabled={disabled}
                type={showPassword ? 'text' : 'password'}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:bg-gray-800 dark:text-gray-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                disabled={disabled}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {auth.type === 'bearer' && auth.bearer && (
        <div className="space-y-4 pt-2">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Bearer token authentication sends the token in the Authorization header with the Bearer prefix.
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Token</label>
            <div className="relative">
              <VariableAwareInput
                value={auth.bearer.token}
                onChange={updateBearerAuth}
                placeholder="Enter bearer token"
                disabled={disabled}
                type={showPassword ? 'text' : 'password'}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono dark:bg-gray-800 dark:text-gray-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={disabled}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {auth.type === 'api-key' && auth.apiKey && (
        <div className="space-y-4 pt-2">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            API key authentication can be sent via request header or query parameter.
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key</label>
            <VariableAwareInput
              value={auth.apiKey.key}
              onChange={value => updateApiKeyAuth('key', value)}
              placeholder="e.g., X-API-Key, api_key"
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:bg-gray-800 dark:text-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Value</label>
            <div className="relative">
              <VariableAwareInput
                value={auth.apiKey.value}
                onChange={value => updateApiKeyAuth('value', value)}
                placeholder="Enter API key value"
                disabled={disabled}
                type={showPassword ? 'text' : 'password'}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono dark:bg-gray-800 dark:text-gray-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={disabled}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Add To</label>
            <select
              value={auth.apiKey.addTo}
              onChange={e => updateApiKeyAuth('addTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:bg-gray-800 dark:text-gray-200"
              disabled={disabled}
            >
              <option value="header">Header</option>
              <option value="query">Query Params</option>
            </select>
          </div>
        </div>
      )}

      {auth.type === 'digest' && auth.digest && (
        <div className="space-y-4 pt-2">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Digest authentication is more secure than Basic auth, using MD5 hashing. The server must support digest authentication.
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
            <VariableAwareInput
              value={auth.digest.username}
              onChange={value => updateDigestAuth('username', value)}
              placeholder="Enter username"
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:bg-gray-800 dark:text-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <div className="relative">
              <VariableAwareInput
                value={auth.digest.password}
                onChange={value => updateDigestAuth('password', value)}
                placeholder="Enter password"
                disabled={disabled}
                type={showPassword ? 'text' : 'password'}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:bg-gray-800 dark:text-gray-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={disabled}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {auth.type === 'oauth' && (
        <div className="pt-2">
          <OAuthEditor
            auth={auth.oauth}
            onAuthChange={(oauth) => {
              // If oauth is being cleared (empty configId), change auth type to none
              if (!oauth.configId) {
                onAuthChange({ type: 'none' });
              } else {
                onAuthChange({ ...auth, type: 'oauth', oauth });
              }
            }}
            disabled={disabled}
          />
        </div>
      )}

      {auth.type === 'none' && (
        <div className="text-sm text-gray-600 dark:text-gray-400 pt-2">
          This request does not use any authentication.
        </div>
      )}
    </div>
  );
}
