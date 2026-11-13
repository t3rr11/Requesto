import path from 'node:path';
import { LocalVariablesRepository } from './local-variables.repository';

/**
 * Stores runtime "current values" for collection variables in
 * `collections.local.json` (gitignored). Scopes are collection ids.
 */
export class CollectionLocalRepository extends LocalVariablesRepository {
  constructor(getLocalDir: () => string) {
    super(() => path.join(getLocalDir(), 'collections.local.json'));
  }

  /** Remove all data for a deleted collection. */
  deleteCollection(collectionId: string): void {
    this.removeScopes((scope) => scope === collectionId);
  }
}
