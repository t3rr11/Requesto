---
title: Workspaces
description: Isolate projects with Requesto workspaces. Each workspace has its own collections, environments, and OAuth configs in a separate directory. Switch, create, clone, import, and export workspaces.
---

# Workspaces

Workspaces let you isolate different projects. Each workspace has its own collections, environments, and OAuth configurations stored in a separate directory.

## How It Works

A workspace is a directory on disk. When you switch workspaces, the backend reads and writes to that workspace's directory, so collections and environments from one project never bleed into another.

Requesto starts with a **Default** workspace. You can create as many additional workspaces as you need.

```
data/
├── workspaces.json           # Registry of all workspaces
├── Default/                  # Default workspace
│   ├── collections.json
│   ├── environments.json
│   ├── oauth-configs.json
│   └── .requesto/            # Local-only data (excluded from git)
│       ├── history.json
│       └── oauth-secrets.json
└── workspaces/               # Additional workspaces
    └── my-project/
        ├── collections.json
        ├── environments.json
        ├── oauth-configs.json
        └── .requesto/
```

## Switching Workspaces

The workspace switcher is at the top of the sidebar. Click it to open a dropdown listing all your workspaces. Select one to switch to it.

<ThemeImage src="/workspaces/workspace-switcher.png" alt="Workspace switcher dropdown" />

If a workspace is a git repository, a branch icon appears next to its name.

The search box in the dropdown filters workspaces by name.

## Managing Workspaces

Click **Manage Workspaces...** at the bottom of the workspace switcher dropdown to open the workspace manager.

<ThemeImage src="/workspaces/workspace-manager-dialog.png" alt="Workspace manager dialog" />

From here you can:

- **Create** a new empty workspace
- **Clone from Git** to create a workspace from a git repository
- **Rename** a workspace by clicking the pencil icon
- **Delete** a workspace (with confirmation). You cannot delete the last remaining workspace.
- **Export** a workspace as a JSON bundle containing all its collections, environments, and OAuth configs
- **Import** a workspace from a previously exported JSON file

## Creating a Workspace

Click **New Workspace** in the workspace manager. Enter a name and click **Create Workspace**.

<ThemeImage src="/workspaces/create-workspace-form.png" alt="Create workspace form" />

### Cloning from Git

Toggle **Clone from Git repository** to create a workspace by cloning a git repo. Enter the repository URL and, for private repositories, a personal access token.

<ThemeImage src="/git/clone-workspace-form.png" alt="Clone from git form" />

The repository is cloned into the `workspaces/` directory and registered as a new workspace. Git operations (commit, push, pull) are available immediately. See [Git Integration](/features/git) for details.

## Opening an Existing Directory

You can also open any existing directory as a workspace. This is useful if you already have a folder of Requesto JSON files or a cloned git repo outside the default data directory.

## Import & Export

**Export**: Click the export button on a workspace row in the manager. The exported JSON file includes all collections, environments, and OAuth configs from that workspace.

**Import**: Click **Import** in the workspace manager footer and select a JSON file. A new workspace is created with the imported data.

## Data Isolation

Each workspace keeps its data separate:

| File | Location | Shared via git |
|------|----------|---------------|
| `collections.json` | Workspace root | Yes |
| `environments.json` | Workspace root | Yes |
| `oauth-configs.json` | Workspace root | Yes (no secrets) |
| `history.json` | `.requesto/` | No |
| `oauth-secrets.json` | `.requesto/` | No |

The `.requesto/` directory holds data that should stay local to your machine. When git is initialized in a workspace, a `.gitignore` is automatically created to exclude `.requesto/` from version control.
