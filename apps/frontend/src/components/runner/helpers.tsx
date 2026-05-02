import { CheckCircle, XCircle, Minus, Loader2 } from 'lucide-react';
import type { Collection, Folder, SavedRequest } from '../../store/collections/types';
import type { ProxyRequest } from '../../store/request/types';
import type { DisplayItem, RequestStatus } from './types';

export function buildDisplayItems(collection: Collection, folderId?: string): DisplayItem[] {
  const items: DisplayItem[] = [];

  function addFolderContents(fId: string, depth: number) {
    const reqs = collection.requests
      .filter(r => r.folderId === fId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    reqs.forEach(r => items.push({ kind: 'request', request: r, depth }));

    const childFolders = (collection.folders || [])
      .filter(f => f.parentId === fId)
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const cf of childFolders) {
      items.push({ kind: 'folder', folder: cf, depth });
      addFolderContents(cf.id, depth + 1);
    }
  }

  if (folderId) {
    addFolderContents(folderId, 0);
  } else {
    const rootFolders = (collection.folders || [])
      .filter(f => !f.parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const rf of rootFolders) {
      items.push({ kind: 'folder', folder: rf, depth: 0 });
      addFolderContents(rf.id, 1);
    }
    const rootReqs = collection.requests
      .filter(r => !r.folderId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    rootReqs.forEach(r => items.push({ kind: 'request', request: r, depth: 0 }));
  }

  return items;
}

export function buildProxyRequest(req: SavedRequest): ProxyRequest {
  return {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    bodyType: req.bodyType,
    formDataEntries: req.formDataEntries,
    auth: req.auth,
  };
}

export function statusIcon(status: RequestStatus): React.ReactElement {
  switch (status) {
    case 'running': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case 'passed':  return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'failed':  return <XCircle className="w-4 h-4 text-red-500" />;
    case 'error':   return <XCircle className="w-4 h-4 text-orange-500" />;
    case 'skipped': return <Minus className="w-4 h-4 text-gray-300 dark:text-gray-600" />;
    default:        return <Minus className="w-4 h-4 text-gray-300 dark:text-gray-600" />;
  }
}

export function httpStatusColor(status: number): string {
  if (status < 300) return 'text-green-600 dark:text-green-400';
  if (status < 400) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

export function isVisible(item: DisplayItem, collapsedFolders: Set<string>, allFolders: Folder[]): boolean {
  if (item.kind === 'folder') {
    const parentId = item.folder.parentId;
    if (!parentId) return true;
    if (collapsedFolders.has(parentId)) return false;
    let current = allFolders.find(f => f.id === parentId);
    while (current) {
      if (collapsedFolders.has(current.id)) return false;
      current = current.parentId ? allFolders.find(f => f.id === current!.parentId) : undefined;
    }
    return true;
  } else {
    const fId = item.request.folderId;
    if (!fId) return true;
    if (collapsedFolders.has(fId)) return false;
    let current = allFolders.find(f => f.id === fId);
    while (current) {
      if (collapsedFolders.has(current.id)) return false;
      current = current.parentId ? allFolders.find(f => f.id === current!.parentId) : undefined;
    }
    return true;
  }
}
