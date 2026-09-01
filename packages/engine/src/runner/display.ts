import type { Collection, Folder, SavedRequest } from '../types.ts';

/**
 * Ordered display items for a run: folders before requests, depth tracked.
 * Shared by the app's Collection Runner and headless runs so both walk a
 * collection identically.
 */
export type DisplayItem =
  | { kind: 'collection'; collectionId: string; name: string }
  | { kind: 'folder'; folder: Folder; depth: number }
  | { kind: 'request'; request: SavedRequest; depth: number };

/**
 * Build the display items for one collection. When `folderIds` is given
 * (resolved folder selectors), only those folders are emitted as roots,
 * each followed by its full subtree; otherwise the whole collection is
 * emitted (root folders first, then root-level requests).
 */
export function buildCollectionItems(collection: Collection, folderIds?: ReadonlySet<string>): DisplayItem[] {
  const items: DisplayItem[] = [];

  function addFolderContents(folder: Folder, depth: number) {
    const reqs = collection.requests
      .filter((r) => r.folderId === folder.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    reqs.forEach((r) => items.push({ kind: 'request', request: r, depth }));

    const childFolders = (collection.folders || [])
      .filter((f) => f.parentId === folder.id)
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const child of childFolders) {
      items.push({ kind: 'folder', folder: child, depth });
      addFolderContents(child, depth + 1);
    }
  }

  const folders = collection.folders || [];
  if (folderIds && folderIds.size > 0) {
    // Only emit folders matching the selector; their whole subtree follows.
    const roots = folders
      .filter((f) => folderIds.has(f.id) || folderIds.has(f.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const folder of roots) {
      items.push({ kind: 'folder', folder, depth: 0 });
      addFolderContents(folder, 1);
    }
    return items;
  }

  const rootFolders = folders
    .filter((f) => !f.parentId)
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const folder of rootFolders) {
    items.push({ kind: 'folder', folder, depth: 0 });
    addFolderContents(folder, 1);
  }
  const rootRequests = collection.requests
    .filter((r) => !r.folderId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  rootRequests.forEach((r) => items.push({ kind: 'request', request: r, depth: 0 }));

  return items;
}

/**
 * Display items across multiple collections: each collection gets a group
 * header followed by its full tree. Used by workspace-wide runs.
 */
export function buildWorkspaceItems(collections: Collection[]): DisplayItem[] {
  const items: DisplayItem[] = [];
  for (const collection of collections) {
    items.push({ kind: 'collection', collectionId: collection.id, name: collection.name });
    items.push(...buildCollectionItems(collection));
  }
  return items;
}

/**
 * Resolve folder selectors (names or ids, case-insensitive) to matching
 * folder ids within a collection. Returns null when no selectors are given
 * (meaning "no filter") and an empty set when selectors exist but match
 * nothing.
 */
export function resolveFolderIds(collection: Collection, selectors: string[]): Set<string> | null {
  if (selectors.length === 0) return null;
  const lower = new Set(selectors.map((s) => s.toLowerCase()));
  const matched = new Set<string>();
  for (const folder of collection.folders || []) {
    if (lower.has(folder.name.toLowerCase()) || lower.has(folder.id.toLowerCase())) {
      matched.add(folder.id);
    }
  }
  return matched;
}
