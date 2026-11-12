import { useCallback, useMemo } from 'react';
import { useEnvironmentStore } from '../store/environments/store';
import { useCollectionsStore } from '../store/collections/store';
import { effectiveVariables } from '../helpers/environment';

export type VariableSource = {
  scope: 'Environment' | 'Collection';
  name?: string;
};

/**
 * The variable scope an editor input sees: the active environment over the
 * tab's collection variables, merged with the same precedence as request
 * substitution. `getSource` reports which scope supplied a key.
 */
export function useVariableScope(collectionId?: string) {
  const environmentsData = useEnvironmentStore(state => state.environmentsData);
  const collections = useCollectionsStore(state => state.collections);

  const activeEnvironment = useMemo(
    () =>
      environmentsData.environments.find(e => e.id === environmentsData.activeEnvironmentId) ?? null,
    [environmentsData],
  );
  const collection = useMemo(
    () => (collectionId ? collections.find(c => c.id === collectionId) ?? null : null),
    [collections, collectionId],
  );
  const variables = useMemo(
    () => effectiveVariables(activeEnvironment, collection).variables,
    [activeEnvironment, collection],
  );

  const getSource = useCallback(
    (key: string): VariableSource | undefined => {
      if (activeEnvironment?.variables.some(v => v.enabled && v.key === key)) {
        return { scope: 'Environment', name: activeEnvironment.name };
      }
      if (collection?.variables?.some(v => v.enabled && v.key === key)) {
        return { scope: 'Collection', name: collection.name };
      }
      return undefined;
    },
    [activeEnvironment, collection],
  );

  return { variables, getSource };
}
