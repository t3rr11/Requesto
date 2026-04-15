export interface Workspace {
  id: string;
  name: string;
  path: string;
  createdAt: number;
  updatedAt: number;
  isGitRepo?: boolean;
}

export interface WorkspacesRegistry {
  activeWorkspaceId: string;
  workspaces: Workspace[];
}
