import { useFormContext } from 'react-hook-form';
import { Shield, Server } from 'lucide-react';
import { getAllProviderTemplates, type OAuthProviderTemplate } from '../../helpers/oauth/providers';
import type { OAuthConfigFormData } from '../schemas/oauthSchema';

interface ProviderStepProps {
  onSelectTemplate: (template: OAuthProviderTemplate | null) => void;
}

export function ProviderStep({ onSelectTemplate }: ProviderStepProps) {
  const { watch, setValue, clearErrors, formState: { errors } } = useFormContext<OAuthConfigFormData>();
  const selected = watch('provider');
  const templates = getAllProviderTemplates();

  const handleSelect = (provider: string) => {
    setValue('provider', provider, { shouldValidate: true });
    clearErrors('provider');

    if (provider === 'custom') {
      onSelectTemplate(null);
      setValue('authorizationUrl', '');
      setValue('tokenUrl', '');
      setValue('revocationUrl', '');
      setValue('scopes', '');
      setValue('flowType', 'authorization-code-pkce');
      setValue('usePKCE', true);
    } else {
      const template = templates.find(t => t.provider === provider) ?? null;
      if (template) {
        onSelectTemplate(template);
        setValue('authorizationUrl', template.authorizationUrl);
        setValue('tokenUrl', template.tokenUrl);
        setValue('revocationUrl', template.revocationUrl ?? '');
        setValue('scopes', template.defaultScopes.join(' '));
        setValue('flowType', template.flowType);
        setValue('usePKCE', template.usePKCE);
      }
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Choose a provider to auto-fill endpoints, or set up a custom configuration.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {templates.map(template => (
          <button
            key={template.provider}
            type="button"
            onClick={() => handleSelect(template.provider)}
            className={`p-4 rounded-lg border-2 text-left transition-colors ${
              selected === template.provider
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Shield size={16} className={selected === template.provider ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'} />
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{template.displayName}</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {template.usePKCE ? 'PKCE · ' : ''}{template.flowType.replace(/-/g, ' ')}
            </div>
          </button>
        ))}

        <button
          type="button"
          onClick={() => handleSelect('custom')}
          className={`p-4 rounded-lg border-2 text-left transition-colors border-dashed ${
            selected === 'custom'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Server size={16} className={selected === 'custom' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'} />
            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">Custom Provider</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Manual endpoint configuration
          </div>
        </button>
      </div>

      {errors.provider && (
        <p className="text-sm text-red-600 dark:text-red-400">{errors.provider.message}</p>
      )}
    </div>
  );
}
