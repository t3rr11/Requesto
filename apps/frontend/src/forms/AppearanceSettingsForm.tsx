import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EVENT_THEMES } from '../events/registry';
import { Button } from '../components/Button';
import { useSettingsStore } from '../store/settings/store';
import { appearanceSchema, type AppearanceFormData } from './schemas/settingsSchemas';

interface AppearanceSettingsFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const AUTO_OVERRIDE = '';

function formatWindow(start: string, end: string): string {
  const [startMonth, startDay] = start.split('-');
  const [endMonth, endDay] = end.split('-');
  return `${startDay}/${startMonth} – ${endDay}/${endMonth}`;
}

export function AppearanceSettingsForm({ onSuccess, onCancel }: Readonly<AppearanceSettingsFormProps>) {
  const disableEventThemes = useSettingsStore(s => s.disableEventThemes);
  const setDisableEventThemes = useSettingsStore(s => s.setDisableEventThemes);
  const overrideEventTheme = useSettingsStore(s => s.overrideEventTheme);
  const setOverrideEventTheme = useSettingsStore(s => s.setOverrideEventTheme);
  const reduceMotion = useSettingsStore(s => s.reduceMotion);
  const setReduceMotion = useSettingsStore(s => s.setReduceMotion);

  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<AppearanceFormData>({
    resolver: zodResolver(appearanceSchema),
    defaultValues: {
      disableEventThemes,
      reduceMotion,
      overrideEventTheme: overrideEventTheme ?? AUTO_OVERRIDE,
    },
  });

  const disableEventThemesWatched = watch('disableEventThemes');

  const onSubmit = (data: AppearanceFormData) => {
    setDisableEventThemes(data.disableEventThemes);
    setReduceMotion(data.reduceMotion);
    setOverrideEventTheme(data.overrideEventTheme === AUTO_OVERRIDE ? null : data.overrideEventTheme);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col space-y-6 h-full">
      <section className="flex-1 overflow-y-auto">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Holiday &amp; Event Themes</h3>

        <div>
          <label htmlFor="event-theme-override" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Holiday theme
          </label>
          <select
            id="event-theme-override"
            {...register('overrideEventTheme')}
            disabled={disableEventThemesWatched}
            className="mt-2 w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value={AUTO_OVERRIDE}>Auto (date-based)</option>
            {EVENT_THEMES.map(event => (
              <option key={event.id} value={event.id}>
                {event.name} ({formatWindow(event.start, event.end)})
              </option>
            ))}
          </select>
          <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
            Choose a theme to force its decorations on all year round or stick with Auto for a bit of fun.
          </span>
        </div>

        <label className="mt-4 flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            {...register('disableEventThemes')}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
          <span className="flex-1">
            <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
              Disable holiday &amp; event themes
            </span>
            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Revert to the standard look during holiday periods and events (e.g. themed header decorations),
              regardless of the date or the selection above.
            </span>
          </span>
        </label>

        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">Motion</h3>

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            {...register('reduceMotion')}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
          <span className="flex-1">
            <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">Reduce motion</span>
            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Disable animations and transitions throughout the app, including holiday decorations.
            </span>
          </span>
        </label>
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
