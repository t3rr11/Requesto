import type { Collection, SavedRequest } from '../../store/collections/types';
import type { ProxyResponse } from '../../store/request/types';
import type { TestResult } from '../../helpers/scriptRunner';
import type { DisplayItem } from 'requesto-engine/runner';

export type { DisplayItem };

export type RequestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'error' | 'skipped';
export type ExpandedTab = 'tests' | 'response';

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
