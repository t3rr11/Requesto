import path from 'node:path';
import { LocalVariablesRepository } from './local-variables.repository';

/**
 * Scope key for collection variables (`<collectionId>`) and folder variables
 * (`<collectionId>::<folderId>`) inside the sidecar file.
 */
export function scopeKey(collectionId: string, folderId?: string): string {
  return folderId ? `${collectionId}::${folderId}` : collectionId;
}

/**
 * Stores runtime "current values" for collection and folder variables in
 * `collections.local.json` (gitignored). Scopes are collection ids or
 * `${collectionId}::${folderId}` keys.
 */
export class CollectionLocalRepository extends LocalVariablesRepository {
  constructor(getLocalDir: () => string) {
    super(() => path.join(getLocalDir(), 'collections.local.json'));
  }

  /** Remove all data for a deleted collection, including its folder scopes. */
  deleteCollection(collectionId: string): void {
    const prefix = `${collectionId}::`;
    this.removeScopes((scope) => scope === collectionId || scope.startsWith(prefix));
  }

  deleteFolder(collectionId: string, folderId: string): void {
    this.resetForScope(scopeKey(collectionId, folderId));
  }
}
