---
title: Git Integration
description: Version-control your Requesto workspace with built-in Git support. Init repos, clone from remote, commit, push, pull, and sync collections with your team - all from inside the app.
---

# Git Integration

Requesto has built-in git support so you can version control your workspace data and share it with a team. Git operations run through the backend using the git installation on your machine.

## Requirements

Git must be installed and available on the system `PATH`. Requesto checks for this automatically and shows a warning if git is not found.

## Initializing a Repository

If your workspace is not already a git repository, you can initialize one from the git panel. This runs `git init` in the workspace directory and creates a `.gitignore` that excludes the `.requesto/` directory, which contains local-only data like request history and OAuth secrets.

## Cloning a Repository

You can create a new workspace by cloning a git repository. In the workspace manager, click **Clone from Git**, enter the repository URL and an optional access token for private repos.

<ThemeImage src="/git/clone-workspace-form.png" alt="Clone from git form" />

The repository is cloned into the `workspaces/` directory and registered as a new workspace. See [Workspaces](/features/workspaces) for more on workspace management.

## Git Status

The workspace switcher shows a branch icon next to workspaces that are git repositories. The git panel displays the current branch, ahead/behind commit counts, and the status of changed files.

Status is refreshed automatically by fetching from the remote when you check it.

## Committing Changes

Click **Commit** in the git panel, enter a commit message, and confirm. All workspace files are staged automatically before the commit. This includes `collections.json`, `environments.json`, and `oauth-configs.json`. Files in `.requesto/` are excluded by the auto-generated `.gitignore`.

## Push and Pull

**Push** sends your commits to the remote. **Pull** fetches and merges changes from the remote. If there are uncommitted local changes when you pull, they are automatically stashed and re-applied after the merge.

## Conflict Resolution

If a pull results in merge conflicts, the git panel shows the conflicted files and lets you resolve them. Two strategies are available:

- **Ours** - keep your local version of the file
- **Theirs** - accept the remote version of the file

You can resolve conflicts file by file or apply the same strategy to all conflicted files at once. After resolving, commit the result.

## Remotes

The git panel lists configured remotes. You can add a new remote by providing a name and URL. This is useful if you initialized a local repository and want to connect it to a remote host.

## What Gets Committed

| File | Committed | Why |
|------|-----------|-----|
| `collections.json` | Yes | Shared API definitions |
| `environments.json` | Yes | Shared environment configs |
| `oauth-configs.json` | Yes | OAuth configs without secrets |
| `.requesto/history.json` | No | Local request history |
| `.requesto/oauth-secrets.json` | No | Contains client secrets |

The `.gitignore` is created automatically when you initialize or clone a repository. It excludes `.requesto/` so that sensitive data and local history stay on your machine.

## Private Repositories

When cloning or pushing to a private repository, provide a personal access token or app password. The token is used for authentication during git operations over HTTPS.
