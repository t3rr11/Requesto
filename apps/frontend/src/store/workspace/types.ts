export type Workspace = {
  id: string;
  name: string;
  path: string;
  createdAt: number;
  updatedAt: number;
  isGitRepo?: boolean;
};

export type WorkspacesRegistry = {
  activeWorkspaceId: string;
  workspaces: Workspace[];
};
