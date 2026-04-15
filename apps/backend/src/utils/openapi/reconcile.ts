import type { Collection, SavedRequest, Folder } from '../../models/collection';
import type {
  SyncFieldChange,
  SyncNewItem,
  SyncUpdatedItem,
  SyncOrphanedItem,
  SyncPreviewResult,
  SyncApplyBody,
} from '../../models/openapi-sync';
export type { SyncFieldChange, SyncNewItem, SyncUpdatedItem, SyncOrphanedItem, SyncPreviewResult, SyncApplyBody };

/**
 * Compare the current collection against a freshly parsed spec and produce
 * a preview of changes. Nothing is written to disk — this is pure computation.
 *
 * Matching strategy: operationId on SavedRequest ↔ operationId on spec request.
 *
 * Field-level merge rules:
 *  - Structural fields (spec-owned): method, url, operationId → always take from spec
 *  - Value fields (user-owned): headers values, body, auth, name → preserve user's version
 */
export function buildSyncPreview(
  existing: Collection,
  incoming: Collection,
  newSpecHash: string,
): SyncPreviewResult {
  const existingByOpId = new Map<string, SavedRequest>();
  for (const req of existing.requests) {
    if (req.operationId) {
      existingByOpId.set(req.operationId, req);
    }
  }

  const incomingByOpId = new Map<string, SavedRequest>();
  for (const req of incoming.requests) {
    if (req.operationId) {
      incomingByOpId.set(req.operationId, req);
    }
  }

  const added: SyncNewItem[] = [];
  const updated: SyncUpdatedItem[] = [];
  let unchangedCount = 0;

  // Walk through incoming requests
  for (const [opId, specReq] of incomingByOpId) {
    const existingReq = existingByOpId.get(opId);

    if (!existingReq) {
      // New operation — not in current collection
      const folder = incoming.folders.find(f => f.id === specReq.folderId);
      added.push({
        operationId: opId,
        request: specReq,
        folderName: folder?.name,
      });
      continue;
    }

    // Existing operation — check for structural changes
    const changes = diffStructuralFields(existingReq, specReq);
    if (changes.length > 0) {
      updated.push({
        requestId: existingReq.id,
        operationId: opId,
        name: existingReq.name,
        changes,
        mergedRequest: mergeRequest(existingReq, specReq),
      });
    } else {
      unchangedCount++;
    }
  }

  // Orphaned: in current collection (with operationId) but not in spec
  const orphaned: SyncOrphanedItem[] = [];
  for (const [opId, existingReq] of existingByOpId) {
    if (!incomingByOpId.has(opId)) {
      orphaned.push({
        requestId: existingReq.id,
        operationId: opId,
        name: existingReq.name,
      });
    }
  }

  // New folders from spec that don't exist by name in current collection
  const existingFolderNames = new Set(existing.folders.map(f => f.name));
  const newFolders = incoming.folders.filter(f => !existingFolderNames.has(f.name));

  return { added, updated, orphaned, unchangedCount, newSpecHash, newFolders };
}

/**
 * Check whether the user's URL is structurally equivalent to the spec URL,
 * meaning the user only substituted placeholder values (like replacing
 * `{{baseUrl}}` with `http://localhost:4000` or `{{petId}}` with `123`).
 *
 * Converts the spec URL into a regex where each `{{placeholder}}` becomes
 * a pattern, and tests whether the user URL matches. Placeholders between
 * slashes use `[^/]+` (single path segment), while the first placeholder
 * at the start uses `.+` to support multi-segment baseUrl expansion.
 *
 * Returns true if the URLs are structurally the same (user only filled in
 * placeholder values), false if there's a real structural difference.
 */
export function urlMatchesTemplate(userUrl: string, specUrl: string): boolean {
  if (userUrl === specUrl) return true;

  // Escape regex special chars, then replace {{placeholders}} with patterns.
  // We process the escaped form where {{ becomes \\{\\{ and }} becomes \\}\\}.
  const escaped = specUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // If no placeholders existed, it's a literal comparison (already handled above)
  if (!specUrl.includes('{{')) return false;

  // Replace placeholders with appropriate patterns:
  // - First placeholder at start of string → .+ (supports multi-segment baseUrl)
  // - All other placeholders → [^/]+ (single path segment)
  let isFirst = true;
  const pattern = escaped.replace(/\\{\\{.+?\\}\\}/g, (_match, offset) => {
    if (isFirst && offset === 0) {
      isFirst = false;
      return '.+';
    }
    isFirst = false;
    return '[^/]+';
  });

  const regex = new RegExp(`^${pattern}$`);
  return regex.test(userUrl);
}

function diffStructuralFields(existing: SavedRequest, incoming: SavedRequest): SyncFieldChange[] {
  const changes: SyncFieldChange[] = [];

  // Method — straightforward comparison
  if ((existing.method ?? '') !== (incoming.method ?? '')) {
    changes.push({ field: 'method', from: existing.method ?? '', to: incoming.method ?? '' });
  }

  // URL — compare using template matching, not raw string equality.
  // If the user only replaced {{placeholders}} with real values, the template
  // will match and we skip the diff (preserving the user's values).
  const existingUrl = existing.url ?? '';
  const specUrl = incoming.url ?? '';
  if (!urlMatchesTemplate(existingUrl, specUrl)) {
    changes.push({ field: 'url', from: existingUrl, to: specUrl });
  }

  return changes;
}

/**
 * Merge structural fields from spec into the user's existing request,
 * preserving user-owned value fields (body, headers, auth, name).
 * For URL: if the user only substituted path param values, keep their URL.
 */
function mergeRequest(existing: SavedRequest, incoming: SavedRequest): SavedRequest {
  const existingUrl = existing.url ?? '';
  const specUrl = incoming.url ?? '';
  // If template matches, the user only filled in placeholder values — keep their URL
  const mergedUrl = urlMatchesTemplate(existingUrl, specUrl) ? existingUrl : incoming.url;

  return {
    ...existing,
    // Structural — take from spec
    method: incoming.method,
    url: mergedUrl,
    // Keep user-owned fields: name, headers, body, bodyType, formDataEntries, auth
    updatedAt: Date.now(),
  };
}

/**
 * Apply sync selections to a collection, producing the new state.
 * Returns the mutated collection (caller writes to disk).
 */
export function applySyncToCollection(
  collection: Collection,
  preview: SyncPreviewResult,
  selections: SyncApplyBody,
): Collection {
  const now = Date.now();

  // 1. Add new folders needed by selected additions
  const addedOps = new Set(selections.addedOperationIds);
  const neededFolderNames = new Set<string>();
  for (const item of preview.added) {
    if (addedOps.has(item.operationId) && item.folderName) {
      neededFolderNames.add(item.folderName);
    }
  }

  const folderNameToId = new Map<string, string>();
  for (const f of collection.folders) {
    folderNameToId.set(f.name, f.id);
  }
  for (const newFolder of preview.newFolders) {
    if (neededFolderNames.has(newFolder.name) && !folderNameToId.has(newFolder.name)) {
      const folder: Folder = { ...newFolder, collectionId: collection.id, createdAt: now, updatedAt: now };
      collection.folders.push(folder);
      folderNameToId.set(folder.name, folder.id);
    }
  }

  // 2. Add selected new requests
  for (const item of preview.added) {
    if (!addedOps.has(item.operationId)) continue;
    const folderId = item.folderName ? folderNameToId.get(item.folderName) : undefined;
    const newReq: SavedRequest = {
      ...item.request,
      id: `req-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      collectionId: collection.id,
      folderId,
      order: collection.requests.length,
      createdAt: now,
      updatedAt: now,
    };
    collection.requests.push(newReq);
  }

  // 3. Apply selected updates
  const updateIds = new Set(selections.updatedRequestIds);
  for (const item of preview.updated) {
    if (!updateIds.has(item.requestId)) continue;
    const idx = collection.requests.findIndex(r => r.id === item.requestId);
    if (idx !== -1) {
      collection.requests[idx] = item.mergedRequest;
    }
  }

  // 4. Remove selected orphans
  const removeIds = new Set(selections.removeRequestIds);
  if (removeIds.size > 0) {
    collection.requests = collection.requests.filter(r => !removeIds.has(r.id));
  }

  // 5. Update spec metadata
  collection.openApiSpec = {
    ...collection.openApiSpec!,
    lastSyncedAt: now,
    specHash: preview.newSpecHash,
  };
  collection.updatedAt = now;

  return collection;
}
