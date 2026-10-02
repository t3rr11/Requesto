import { create } from 'zustand';
import * as actions from './actions';
import type {
  MockDatasetCounts,
  MockEndpoint,
  MockRequestLogEntry,
  MockServerStatus,
  NewMockEndpointInput,
} from './types';

type MockState = {
  endpoints: MockEndpoint[];
  loading: boolean;
  status: MockServerStatus;
  selectedEndpointId: string | null;
  logs: MockRequestLogEntry[];
  error: string | null;
  datasetCounts: MockDatasetCounts;

  loadEndpoints: () => Promise<void>;
  selectEndpoint: (id: string | null) => void;
  createEndpoint: (data: NewMockEndpointInput) => Promise<MockEndpoint>;
  updateEndpoint: (id: string, updates: Partial<MockEndpoint>) => Promise<boolean>;
  deleteEndpoint: (id: string) => Promise<boolean>;
  duplicateEndpoint: (id: string) => Promise<boolean>;
  loadDataset: (id: string) => Promise<unknown[]>;
  updateDataset: (id: string, records: unknown[]) => Promise<boolean>;
  reorderEndpoints: (ids: string[]) => Promise<void>;
  clearEndpointData: (id: string) => Promise<boolean>;
  refreshDatasetCount: (id: string) => Promise<void>;
  refreshStatus: () => Promise<void>;
  loadLogs: () => Promise<void>;
  clearLogs: () => void;
  setError: (message: string | null) => void;
};

export const useMockStore = create<MockState>((set) => ({
  endpoints: [],
  loading: false,
  status: { running: false, port: 0, url: null },
  selectedEndpointId: null,
  logs: [],
  error: null,
  datasetCounts: {},

  loadEndpoints: () => actions.loadEndpoints(set),
  selectEndpoint: (id) => actions.selectEndpoint(set, id),
  createEndpoint: (data) => actions.createEndpoint(set, data),
  updateEndpoint: (id, updates) => actions.updateEndpoint(set, id, updates),
  deleteEndpoint: (id) => actions.deleteEndpoint(set, id),
  duplicateEndpoint: (id) => actions.duplicateEndpoint(set, id),
  loadDataset: (id) => actions.loadDataset(id),
  updateDataset: (id, records) => actions.updateDataset(set, id, records),
  reorderEndpoints: (ids) => actions.reorderEndpoints(set, ids),
  clearEndpointData: (id) => actions.clearEndpointData(set, id),
  refreshDatasetCount: (id) => actions.refreshDatasetCount(set, id),
  refreshStatus: () => actions.refreshStatus(set),
  loadLogs: () => actions.loadLogs(set),
  clearLogs: () => actions.clearLogs(set),
  setError: (message) => actions.setError(set, message),
}));
