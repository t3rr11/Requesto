---
title: Workspaces
description: Isolate projects with Requesto workspaces. Each workspace has its own collections, environments, and OAuth configs in a separate directory. Switch, create, clone, open, import, and export workspaces.
---

# Workspaces

Workspaces let you isolate different projects. Each workspace has its own collections, environments, and OAuth configurations stored in a separate directory.

## How It Works

A workspace is a directory on disk. When you switch workspaces, the backend reads and writes to that workspace's directory, so collections and environments from one project never bleed into another.

Requesto starts with a built-in workspace named **Local Workspace** (stored in the `Default/` directory). You can create as many additional workspaces as you need.

```
data/
├── workspaces.json           # Registry of all workspaces
├── Default/                  # Built-in workspace ("Local Workspace")
│   └── .requesto/            # All workspace data
│       ├── collections.json
│       ├── environments.json
│       ├── oauth-configs.json
│       ├── .gitignore        # Ignores the local/ subdirectory
│       └── local/            # Local-only data (excluded from git)
│           ├── history.json
│           ├── environments.local.json
│           ├── oauth-secrets.json
│           └── oauth-tokens.json
└── workspaces/               # Additional workspaces (created or git-cloned)
```

## Switching Workspaces

The workspace switcher is in the top header bar. Click it to open a dropdown listing all your workspaces. Select one to switch to it.

<ThemeImage src="/workspaces/workspace-switcher.png" alt="Workspace switcher dropdown" />

If a workspace is a git repository, a branch icon appears next to its name.

The search box in the dropdown filters workspaces by name.

## Adding a Workspace

Click **Add Workspace...** at the bottom of the workspace switcher dropdown (or open the workspace manager and click **Add Workspace**). The dialog offers four ways to add a workspace:

<ThemeImage src="/workspaces/add-workspace-open.png" alt="Add Workspace dialog in Open Folder mode" />

- **New** — create an empty workspace. Requesto creates the folder and its `.requesto/` data directory under `data/workspaces/`.
- **Open Folder** — register a folder that already contains Requesto data (for example a project repo with a `.requesto/` folder). See below.
- **Clone from Git** — clone a git repository into `data/workspaces/` and register it as a workspace. See [Git Integration](/features/git).
- **Import File** — restore a previously exported workspace bundle (`.json`).

When you add a workspace, Requesto switches to it automatically.

### Opening an Existing Project Folder

If you've pulled down a project repo that already contains a `.requesto/` folder, use **Open Folder**:

1. Open the Add Workspace dialog and choose **Open Folder**
2. Select the folder (desktop app) or type its path (web/Docker)
3. Requesto previews what it found — for example *"Requesto workspace found — 3 collections, 2 environments"*
4. Click **Add Workspace**

The preview tells you what you're about to open before anything is registered:

- **Requesto workspace found** — the folder contains Requesto data and will be opened as-is
- **No Requesto data here yet** — the folder is valid, and a new workspace will be created inside it
- **Directory not found** — the path doesn't exist on the machine running Requesto

In the desktop app, **Browse…** opens a native folder picker. In the web/Docker version, type the folder path **as seen by the Requesto server** — for Docker, mount the host folder first, e.g. `-v ~/projects/my-api:/workspaces/my-api`, then open `/workspaces/my-api`.

Older data layouts are migrated to the `.requesto/` layout automatically when opened.

## Managing Workspaces

Click **Manage Workspaces...** at the bottom of the workspace switcher dropdown to open the workspace manager.

<ThemeImage src="/workspaces/workspace-manager-dialog.png" alt="Workspace manager dialog" />

From here you can:

- **Rename** a workspace by clicking the pencil icon, which opens a rename dialog
- **Remove** a workspace from the list (with confirmation). This removes it from your workspace list only - the folder and its files stay on disk and it can be re-added later. You cannot remove the last remaining workspace.
- **Export** a workspace as a JSON bundle containing all its collections, environments, and OAuth configs
- **Import** a workspace from a previously exported JSON file (via **Add Workspace** → **Import File**)

## Renaming a Workspace

Click the pencil icon next to a workspace in either the workspace switcher or the workspace manager. A dialog will appear where you can enter the new name and confirm.

## Data Isolation

Each workspace stores its data inside a `.requesto/` subdirectory:

| File | Location | Shared via git |
|------|----------|---------------|
| `collections.json` | `.requesto/` | Yes |
| `environments.json` | `.requesto/` | Yes |
| `oauth-configs.json` | `.requesto/` (no secrets) | Yes |
| `graphql-schemas.json` | `.requesto/` | Yes |
| `history.json` | `.requesto/local/` | No |
| `environments.local.json` | `.requesto/local/` | No |
| `oauth-secrets.json` | `.requesto/local/` | No |
| `oauth-tokens.json` | `.requesto/local/` | No |

The `.requesto/local/` directory holds data that should stay local to your machine. Every workspace gets a `.requesto/.gitignore` automatically (created on workspace creation, clone, git init, and server startup) that excludes the `local/` subdirectory from version control. This means Requesto can safely coexist with an existing git project — only the `.requesto/` folder is added to your repository.
