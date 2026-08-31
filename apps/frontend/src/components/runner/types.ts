import type { Collection, Folder, SavedRequest } from '../../store/collections/types';
import type { ProxyResponse } from '../../store/request/types';
import type { TestResult } from '../../helpers/scriptRunner';

export type RequestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'error' | 'skipped';
export type ExpandedTab = 'tests' | 'response';

export type DisplayItem =
  | { kind: 'collection'; collectionId: string; name: string }
  | { kind: 'folder'; folder: Folder; depth: number }
  | { kind: 'request'; request: SavedRequest; depth: number };

export type RequestRunResult = {
  request: SavedRequest;
  status: RequestStatus;
  response: ProxyResponse | null;
  testResults: TestResult[];
  error?: string;
  /** ms */
  duration?: number;
};

export interface CollectionRunnerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Collections to run, in order. A single collection renders without group headers. */
  collections: Collection[];
  /** When set, only runs requests within this folder and its subfolders of collections[0]. */
  folderId?: string;
}
