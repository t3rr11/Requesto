import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { VariableAwareInput } from './VariableAwareInput';
import { OAuthEditor } from './OAuthEditor';
import type { AuthConfig, AuthType } from '../store/request/types';

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

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-transparent text-black dark:text-gray-200';

  const selectClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200';

  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
  const descClass = 'text-sm text-gray-600 dark:text-gray-400 mb-4';

  const ToggleButton = () => (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-400"
      disabled={disabled}
    >
      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Authentication Type</label>
        <select
          value={auth.type}
          onChange={e => handleTypeChange(e.target.value as AuthType)}
          className={selectClass}
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
          <div className={descClass}>
            Basic authentication sends credentials as base64-encoded username:password in the Authorization header.
          </div>
          <div>
            <label className={labelClass}>Username</label>
            <VariableAwareInput
              value={auth.basic.username}
              onChange={value => onAuthChange({ ...auth, basic: { ...auth.basic!, username: value } })}
              placeholder="Enter username"
              disabled={disabled}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Password</label>
            <div className="relative">
              <VariableAwareInput
                value={auth.basic.password}
                onChange={value => onAuthChange({ ...auth, basic: { ...auth.basic!, password: value } })}
                placeholder="Enter password"
                disabled={disabled}
                type={showPassword ? 'text' : 'password'}
                className={`${inputClass} pr-10`}
              />
              <ToggleButton />
            </div>
          </div>
        </div>
      )}

      {auth.type === 'bearer' && auth.bearer && (
        <div className="space-y-4 pt-2">
          <div className={descClass}>
            Bearer token authentication sends the token in the Authorization header with the Bearer prefix.
            Supports environment variables (e.g. <code className="px-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">{`{{API_TOKEN}}`}</code>).
          </div>
          <div>
            <label className={labelClass}>Token</label>
            <VariableAwareInput
              value={auth.bearer.token}
              onChange={value => onAuthChange({ ...auth, bearer: { token: value } })}
              placeholder="Enter bearer token"
              disabled={disabled}
              type="text"
              className={inputClass}
            />
          </div>
        </div>
      )}

      {auth.type === 'api-key' && auth.apiKey && (
        <div className="space-y-4 pt-2">
          <div className={descClass}>
            API key authentication can be sent via request header or query parameter.
          </div>
          <div>
            <label className={labelClass}>Key</label>
            <VariableAwareInput
              value={auth.apiKey.key}
              onChange={value => onAuthChange({ ...auth, apiKey: { ...auth.apiKey!, key: value } })}
              placeholder="e.g., X-API-Key, api_key"
              disabled={disabled}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Value</label>
            <div className="relative">
              <VariableAwareInput
                value={auth.apiKey.value}
                onChange={value => onAuthChange({ ...auth, apiKey: { ...auth.apiKey!, value: value } })}
                placeholder="Enter API key value"
                disabled={disabled}
                type="text"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Add To</label>
            <select
              value={auth.apiKey.addTo}
              onChange={e => onAuthChange({ ...auth, apiKey: { ...auth.apiKey!, addTo: e.target.value as 'header' | 'query' } })}
              className={selectClass}
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
          <div className={descClass}>
            Digest authentication is more secure than Basic auth, using MD5 hashing.
          </div>
          <div>
            <label className={labelClass}>Username</label>
            <VariableAwareInput
              value={auth.digest.username}
              onChange={value => onAuthChange({ ...auth, digest: { ...auth.digest!, username: value } })}
              placeholder="Enter username"
              disabled={disabled}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Password</label>
            <div className="relative">
              <VariableAwareInput
                value={auth.digest.password}
                onChange={value => onAuthChange({ ...auth, digest: { ...auth.digest!, password: value } })}
                placeholder="Enter password"
                disabled={disabled}
                type={showPassword ? 'text' : 'password'}
                className={`${inputClass} pr-10`}
              />
              <ToggleButton />
            </div>
          </div>
        </div>
      )}

      {auth.type === 'oauth' && (
        <div className="pt-2">
          <OAuthEditor
            auth={auth.oauth}
            onAuthChange={oauth => {
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
