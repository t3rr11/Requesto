import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Eye, EyeOff, Info } from 'lucide-react';
import { Button } from '../../components/Button';
import type { OAuthProviderTemplate } from '../../helpers/oauth/providers';
import { extractUrlPlaceholders } from '../../helpers/oauth/providers';
import type { OAuthConfigFormData } from '../schemas/oauthSchema';

interface CredentialsStepProps {
  template: OAuthProviderTemplate | null;
  placeholders: Record<string, string>;
  onPlaceholderChange: (placeholders: Record<string, string>) => void;
}

export function CredentialsStep({ template, placeholders, onPlaceholderChange }: CredentialsStepProps) {
  const { register, formState: { errors } } = useFormContext<OAuthConfigFormData>();
  const [showSecret, setShowSecret] = useState(false);

  const templatePlaceholders = template
    ? [...new Set([
        ...extractUrlPlaceholders(template.authorizationUrl),
        ...extractUrlPlaceholders(template.tokenUrl),
      ])]
    : [];

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="config-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Configuration Name <span className="text-red-500">*</span>
        </label>
        <input
          id="config-name"
          type="text"
          {...register('name')}
          placeholder="e.g., Production Microsoft, Dev GitHub"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          autoFocus
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
        )}
      </div>

      {templatePlaceholders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded text-sm">
            <Info size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <p className="text-blue-800 dark:text-blue-300 text-xs">{template?.notes}</p>
          </div>
          {templatePlaceholders.map(placeholder => (
            <div key={placeholder}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {placeholder} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={placeholders[placeholder] ?? ''}
                onChange={e => onPlaceholderChange({ ...placeholders, [placeholder]: e.target.value })}
                placeholder={`Enter ${placeholder}`}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
              />
            </div>
          ))}
        </div>
      )}

      <div>
        <label htmlFor="client-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Client ID <span className="text-red-500">*</span>
        </label>
        <input
          id="client-id"
          type="text"
          {...register('clientId')}
          placeholder="Your OAuth client ID"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
        />
        {errors.clientId && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.clientId.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="client-secret" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Client Secret
        </label>
        <div className="relative">
          <input
            id="client-secret"
            type={showSecret ? 'text' : 'password'}
            {...register('clientSecret')}
            placeholder="Optional (for confidential clients)"
            className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
          />
          <Button
            type="button"
            onClick={() => setShowSecret(prev => !prev)}
            variant="icon"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
          </Button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Stored securely on the server. Required for client credentials and password flows.
        </p>
      </div>
    </div>
  );
}
