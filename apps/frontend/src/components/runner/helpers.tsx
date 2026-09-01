import { CheckCircle, XCircle, Minus, Loader2 } from 'lucide-react';
import type { Folder } from '../../store/collections/types';
import type { DisplayItem, RequestStatus } from './types';

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

/**
 * Whether a display item is visible given collapsed folders and (in
 * multi-collection runs) collapsed collections. A collapsed collection hides
 * all of its folders and requests but never its own header row.
 */
export function isVisible(
  item: DisplayItem,
  collapsedFolders: Set<string>,
  collapsedCollections: Set<string>,
  allFolders: Folder[],
): boolean {
  if (item.kind === 'collection') return true;
  if (collapsedCollections.has(item.kind === 'folder' ? item.folder.collectionId : item.request.collectionId)) {
    return false;
  }
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
