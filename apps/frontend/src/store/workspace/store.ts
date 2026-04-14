import { create } from 'zustand';
import type { Workspace, WorkspacesRegistry } from './types';
import * as actions from './actions';

type WorkspaceState = {
  registry: WorkspacesRegistry;
  loading: boolean;

  loadWorkspaces: () => Promise<void>;
  createWorkspace: (data: { name: string }) => Promise<Workspace>;
  cloneWorkspace: (data: { name: string; repoUrl: string; authToken?: string }) => Promise<Workspace>;
  updateWorkspace: (id: string, data: { name: string }) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
  switchWorkspace: (id: string) => Promise<Workspace>;
  openWorkspace: (data: { name: string; path: string }) => Promise<Workspace>;
  exportWorkspace: (id: string) => Promise<void>;
  importWorkspace: (file: File) => Promise<Workspace>;
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  registry: { activeWorkspaceId: '', workspaces: [] },
  loading: false,

  loadWorkspaces: () => actions.loadWorkspaces(set),
  createWorkspace: (data) => actions.createWorkspace(set, data),
  cloneWorkspace: (data) => actions.cloneWorkspace(set, data),
  updateWorkspace: (id, data) => actions.updateWorkspace(set, id, data),
  deleteWorkspace: (id) => actions.deleteWorkspace(set, get, id),
  switchWorkspace: (id) => actions.switchWorkspace(set, id),
  openWorkspace: (data) => actions.openWorkspace(set, data),
  exportWorkspace: (id) => actions.exportWorkspace(id),
  importWorkspace: (file) => actions.importWorkspace(set, file),
}));
