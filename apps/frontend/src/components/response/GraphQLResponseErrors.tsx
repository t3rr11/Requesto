import { AlertTriangle } from 'lucide-react';
import type { GraphQLResponseError } from '../../helpers/response';

interface GraphQLResponseErrorsProps {
  errors: GraphQLResponseError[];
}

export function GraphQLResponseErrors({ errors }: Readonly<GraphQLResponseErrorsProps>) {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {errors.map((error, index) => (
          <div key={`${error.message}-${index}`} className="py-4 first:pt-0">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <div className="min-w-0 space-y-2">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{error.message}</p>
                {error.path?.length ? (
                  <p className="font-mono text-xs text-gray-600 dark:text-gray-400">
                    Path: {error.path.join('.')}
                  </p>
                ) : null}
                {error.locations?.length ? (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {error.locations.map(location => `Line ${location.line}, column ${location.column}`).join('; ')}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
