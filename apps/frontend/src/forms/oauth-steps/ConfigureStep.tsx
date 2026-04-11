import { useFormContext } from 'react-hook-form';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { OAuthConfigFormData } from '../schemas/oauthSchema';
import type { OAuthFlowType } from '../../store/oauth/types';
import type { OAuthProviderTemplate } from '../../helpers/oauth/providers';

interface ConfigureStepProps {
  template: OAuthProviderTemplate | null;
}

const FLOW_OPTIONS: { value: OAuthFlowType; label: string; description: string; badge?: string }[] = [
  {
    value: 'authorization-code-pkce',
    label: 'Authorization Code with PKCE',
    description: 'Most secure option for browser-based apps. Prevents code interception attacks.',
    badge: 'Recommended',
  },
  {
    value: 'authorization-code',
    label: 'Authorization Code',
    description: 'Standard flow for server-side apps. Requires a client secret.',
  },
  {
    value: 'client-credentials',
    label: 'Client Credentials',
    description: 'Machine-to-machine auth without user interaction. Requires client secret.',
  },
  {
    value: 'implicit',
    label: 'Implicit',
    description: 'Tokens returned directly in URL. Deprecated — use PKCE instead.',
    badge: 'Deprecated',
  },
  {
    value: 'password',
    label: 'Resource Owner Password',
    description: 'Sends user credentials directly. Only for trusted first-party apps.',
    badge: 'Not Recommended',
  },
];

export function ConfigureStep({ template }: ConfigureStepProps) {
  const { register, watch, setValue, formState: { errors } } = useFormContext<OAuthConfigFormData>();
  const flowType = watch('flowType');
  const provider = watch('provider');
  const isCustom = provider === 'custom';
  const [showEndpoints, setShowEndpoints] = useState(isCustom);

  const handleFlowChange = (value: OAuthFlowType) => {
    setValue('flowType', value, { shouldValidate: true });
    setValue('usePKCE', value === 'authorization-code-pkce');
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          OAuth Flow
        </label>
        <div className="space-y-2">
          {FLOW_OPTIONS.map(option => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                flowType === option.value
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-400'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <input
                type="radio"
                name="flowType"
                value={option.value}
                checked={flowType === option.value}
                onChange={() => handleFlowChange(option.value)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{option.label}</span>
                  {option.badge && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      option.badge === 'Recommended'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : option.badge === 'Deprecated'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {option.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="scopes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Scopes
        </label>
        <input
          id="scopes"
          type="text"
          {...register('scopes')}
          placeholder="openid profile email"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {template?.scopeDescription ?? 'Space-separated list of OAuth scopes'}
        </p>
      </div>

      <div>
        {!isCustom && (
          <button
            type="button"
            onClick={() => setShowEndpoints(prev => !prev)}
            className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-2"
          >
            {showEndpoints ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showEndpoints ? 'Hide' : 'Show'} endpoint URLs
          </button>
        )}

        {isCustom && (
          <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded text-sm mb-3">
            <Info size={16} className="text-gray-500 shrink-0 mt-0.5" />
            <span className="text-gray-600 dark:text-gray-400 text-xs">
              Enter the OAuth endpoint URLs from your provider's documentation.
            </span>
          </div>
        )}

        {(isCustom || showEndpoints) && (
          <div className="space-y-3">
            <div>
              <label htmlFor="auth-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Authorization URL <span className="text-red-500">*</span>
              </label>
              <input
                id="auth-url"
                type="text"
                {...register('authorizationUrl')}
                placeholder="https://provider.com/oauth2/authorize"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-xs"
              />
              {errors.authorizationUrl && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.authorizationUrl.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="token-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Token URL <span className="text-red-500">*</span>
              </label>
              <input
                id="token-url"
                type="text"
                {...register('tokenUrl')}
                placeholder="https://provider.com/oauth2/token"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-xs"
              />
              {errors.tokenUrl && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.tokenUrl.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="revocation-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Revocation URL
              </label>
              <input
                id="revocation-url"
                type="text"
                {...register('revocationUrl')}
                placeholder="https://provider.com/oauth2/revoke"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-xs"
              />
            </div>

            <div>
              <label htmlFor="redirect-uri" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Redirect URI
              </label>
              <input
                id="redirect-uri"
                type="text"
                {...register('redirectUri')}
                placeholder="Auto-detected from current URL"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-xs"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Leave blank to auto-detect.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
