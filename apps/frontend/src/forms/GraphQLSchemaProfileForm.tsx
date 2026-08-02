import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../components/Button';
import type { GraphQLSchemaProfile, GraphQLSchemaProfileInput } from '../store/graphql/types';

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Profile name is required'),
  sourceType: z.enum(['endpoint', 'sdl', 'introspection-json']),
  sourceUrl: z.string().optional(),
  content: z.string().optional(),
}).superRefine((value, context) => {
  if (value.sourceType === 'endpoint' && !value.sourceUrl?.trim()) {
    context.addIssue({ code: 'custom', path: ['sourceUrl'], message: 'Endpoint URL is required' });
  }
  if (value.sourceType !== 'endpoint' && !value.content?.trim()) {
    context.addIssue({ code: 'custom', path: ['content'], message: 'Schema content is required' });
  }
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface GraphQLSchemaProfileFormProps {
  profile?: GraphQLSchemaProfile;
  defaultUrl: string;
  onSave: (input: GraphQLSchemaProfileInput) => Promise<void>;
  onCancel: () => void;
}

export function GraphQLSchemaProfileForm({
  profile,
  defaultUrl,
  onSave,
  onCancel,
}: Readonly<GraphQLSchemaProfileFormProps>) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile?.name ?? '',
      sourceType: profile?.sourceType ?? 'endpoint',
      sourceUrl: profile?.sourceUrl ?? defaultUrl,
      content: profile?.content ?? '',
    },
  });
  const sourceType = watch('sourceType');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setValue('content', await file.text(), { shouldDirty: true, shouldValidate: true });
  };

  const submit = async (data: ProfileFormData) => {
    const input: GraphQLSchemaProfileInput = {
      name: data.name,
      sourceType: data.sourceType,
      ...(data.sourceType === 'endpoint'
        ? { sourceUrl: data.sourceUrl?.trim() ?? '' }
        : { content: data.content?.trim() ?? '' }),
    };
    try {
      await onSave(input);
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div>
        <label htmlFor="graphql-profile-name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Profile name
        </label>
        <input
          id="graphql-profile-name"
          {...register('name')}
          className="w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:text-gray-100"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="graphql-profile-source" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Schema source
        </label>
        <select
          id="graphql-profile-source"
          {...register('sourceType')}
          className="w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:text-gray-100"
        >
          <option value="endpoint">Endpoint introspection</option>
          <option value="sdl">GraphQL SDL</option>
          <option value="introspection-json">Introspection JSON</option>
        </select>
      </div>

      {sourceType === 'endpoint' ? (
        <div>
          <label htmlFor="graphql-profile-url" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Schema endpoint
          </label>
          <input
            id="graphql-profile-url"
            {...register('sourceUrl')}
            placeholder="https://api.example.com/graphql"
            className="w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:text-gray-100"
          />
          {errors.sourceUrl && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.sourceUrl.message}</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="graphql-profile-content" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {sourceType === 'sdl' ? 'Schema SDL' : 'Introspection JSON'}
            </label>
            <input
              type="file"
              accept={sourceType === 'sdl' ? '.graphql,.graphqls,.gql,.txt' : '.json'}
              onChange={handleFileChange}
              className="max-w-56 text-xs text-gray-600 file:mr-2 file:rounded file:border-0 file:px-2 file:py-1 dark:text-gray-400"
            />
          </div>
          <textarea
            id="graphql-profile-content"
            {...register('content')}
            rows={10}
            spellCheck={false}
            className="w-full resize-y rounded-md border border-gray-300 bg-transparent px-3 py-2 font-mono text-xs text-gray-900 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:text-gray-100"
          />
          {errors.content && <p className="text-sm text-red-600 dark:text-red-400">{errors.content.message}</p>}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>{profile ? 'Update profile' : 'Create profile'}</Button>
      </div>
      {errors.root?.message && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">{errors.root.message}</p>
      )}
    </form>
  );
}
