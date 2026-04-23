import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../components/Button';
import { useSettingsStore } from '../store/settings/store';
import { settingsSchema, type SettingsFormData } from './schemas/settingsSchemas';

interface SettingsFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function SettingsForm({ onSuccess, onCancel }: SettingsFormProps) {
  const insecureTls = useSettingsStore(s => s.insecureTls);
  const setInsecureTls = useSettingsStore(s => s.setInsecureTls);

  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      insecureTls,
    },
  });

  const insecureTlsWatched = watch('insecureTls');

  const onSubmit = (data: SettingsFormData) => {
    setInsecureTls(data.insecureTls);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Network</h3>

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            {...register('insecureTls')}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
          <span className="flex-1">
            <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
              Ignore SSL certificate errors
            </span>
            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Allow connections to servers using self-signed or otherwise untrusted TLS certificates.
              Applies to both OAuth token requests and outgoing API requests.
            </span>
          </span>
        </label>

        {insecureTlsWatched && (
          <div className="mt-3 flex gap-2 rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
            <span>
              Disabling certificate verification removes a key security guarantee. Only enable this when you trust
              the network you're connecting to (e.g. local development or internal infrastructure).
            </span>
          </div>
        )}
      </section>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" onClick={onCancel} variant="ghost" size="md">
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="md" loading={isSubmitting} disabled={isSubmitting}>
          Save Settings
        </Button>
      </div>
    </form>
  );
}
