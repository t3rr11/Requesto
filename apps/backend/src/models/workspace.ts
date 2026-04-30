export interface Workspace {
  id: string;
  name: string;
  path: string;
  isGitRepo?: boolean;
}

export interface WorkspacesRegistry {
  activeWorkspaceId: string;
  workspaces: Workspace[];
}
