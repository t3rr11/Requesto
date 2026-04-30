export type Workspace = {
  id: string;
  name: string;
  path: string;
  isGitRepo?: boolean;
};

export type WorkspacesRegistry = {
  activeWorkspaceId: string;
  workspaces: Workspace[];
};
