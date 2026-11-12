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

  /** Remove all data for a deleted folder and its deleted descendants. */
  deleteFolder(collectionId: string, folderIds: string[]): void {
    const keys = new Set(folderIds.map((id) => scopeKey(collectionId, id)));
    this.removeScopes((scope) => keys.has(scope));
  }

  /** Re-key folder scopes after the folders moved to another collection (folder ids survive moves). */
  moveScopesToCollection(collectionId: string, targetCollectionId: string, folderIds: string[]): void {
    const data = this.readAll();
    let changed = false;
    for (const folderId of folderIds) {
      const from = scopeKey(collectionId, folderId);
      const to = scopeKey(targetCollectionId, folderId);
      if (from === to || !data[from]) continue;
      data[to] = { ...(data[to] ?? {}), ...data[from] };
      delete data[from];
      changed = true;
    }
    if (changed) this.writeAll(data);
  }
}
