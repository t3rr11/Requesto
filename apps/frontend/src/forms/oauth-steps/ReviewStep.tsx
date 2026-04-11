import { useFormContext } from 'react-hook-form';
import { Check } from 'lucide-react';
import type { OAuthConfigFormData } from '../schemas/oauthSchema';
import type { OAuthProviderTemplate } from '../../helpers/oauth/providers';
import type { OAuthTokenStorage } from '../../store/oauth/types';

interface ReviewStepProps {
  template: OAuthProviderTemplate | null;
}

const STORAGE_LABELS: Record<OAuthTokenStorage, { label: string; description: string }> = {
  memory: { label: 'Memory', description: 'Most secure — lost on page refresh' },
  session: { label: 'Session Storage', description: 'Cleared when browser tab is closed' },
  local: { label: 'Local Storage', description: 'Persists across browser restarts' },
};

export function ReviewStep({ template }: ReviewStepProps) {
  const { watch, register, setValue } = useFormContext<OAuthConfigFormData>();
  const values = watch();

  return (
    <div className="space-y-5">
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Summary</h4>
        <dl className="space-y-2 text-sm">
          <SummaryRow label="Name" value={values.name || '—'} />
          <SummaryRow label="Provider" value={template?.displayName ?? 'Custom'} />
          <SummaryRow label="Flow" value={values.flowType.replace(/-/g, ' ')} />
          <SummaryRow label="PKCE" value={values.usePKCE ? 'Enabled' : 'Disabled'} />
          <SummaryRow label="Scopes" value={values.scopes || 'None'} />
          {values.authorizationUrl && (
            <SummaryRow label="Auth URL" value={values.authorizationUrl} mono />
          )}
        </dl>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Token Storage
        </label>
        <div className="space-y-2">
          {(Object.entries(STORAGE_LABELS) as [OAuthTokenStorage, { label: string; description: string }][]).map(
            ([value, { label, description }]) => (
              <label
                key={value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  values.tokenStorage === value
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-400'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="tokenStorage"
                  value={value}
                  checked={values.tokenStorage === value}
                  onChange={() => setValue('tokenStorage', value)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  values.tokenStorage === value
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {values.tokenStorage === value && <Check size={10} className="text-white" />}
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
                </div>
              </label>
            ),
          )}
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer">
          <input
            type="checkbox"
            {...register('usePopup')}
            className="mt-0.5 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500"
          />
          <div className="flex-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Use Popup Window</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Opens OAuth flow in a popup instead of a full page redirect.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer">
          <input
            type="checkbox"
            {...register('autoRefreshToken')}
            className="mt-0.5 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500"
          />
          <div className="flex-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto-Refresh Tokens</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Automatically refreshes tokens before they expire.
            </p>
          </div>
        </label>

        {values.autoRefreshToken && (
          <div className="pl-6">
            <label htmlFor="refresh-threshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Refresh Threshold (seconds)
            </label>
            <input
              id="refresh-threshold"
              type="number"
              min={60}
              max={3600}
              {...register('tokenRefreshThreshold', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Refresh this many seconds before expiry (default: 300)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500 dark:text-gray-400 shrink-0">{label}</dt>
      <dd className={`text-gray-900 dark:text-gray-100 font-medium text-right truncate ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
