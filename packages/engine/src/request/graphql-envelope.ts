/**
 * GraphQL response-envelope detection shared by the runner (engine) and the
 * frontend response panel: surfaces the `errors` envelope inside an HTTP 200
 * response that the runner would otherwise ignore.
 */

import type { ProxyResponse } from '../types.ts';

export type GraphQLResponseError = {
  message: string;
  path?: Array<string | number>;
  locations?: Array<{ line: number; column: number }>;
};

export type GraphQLResponseInfo = {
  errors: GraphQLResponseError[];
  hasData: boolean;
  isPartial: boolean;
};

/** Structural subset of ProxyResponse so hosts can pass their own response type. */
type GraphqlInspectResponse = Pick<ProxyResponse, 'body' | 'bodyEncoding'>;

export function getGraphQLResponseInfo(response: GraphqlInspectResponse): GraphQLResponseInfo | null {
  if (response.bodyEncoding !== 'utf8') return null;
  try {
    const payload: unknown = JSON.parse(response.body);
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
    const envelope = payload as { data?: unknown; errors?: unknown };
    if (!Array.isArray(envelope.errors)) return null;
    const errors = envelope.errors
      .filter((error): error is Record<string, unknown> => typeof error === 'object' && error !== null)
      .map(error => ({
        message: typeof error.message === 'string' ? error.message : 'Unknown GraphQL error',
        ...(Array.isArray(error.path) && { path: error.path as Array<string | number> }),
        ...(Array.isArray(error.locations) && {
          locations: error.locations.filter(
            (location): location is { line: number; column: number } =>
              typeof location === 'object' &&
              location !== null &&
              typeof (location as Record<string, unknown>).line === 'number' &&
              typeof (location as Record<string, unknown>).column === 'number',
          ),
        }),
      }));
    const hasData = Object.prototype.hasOwnProperty.call(envelope, 'data') && envelope.data !== null;
    return { errors, hasData, isPartial: hasData && errors.length > 0 };
  } catch {
    return null;
  }
}
