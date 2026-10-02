---
title: Creating & Managing Endpoints
description: Create, edit, duplicate, disable, and delete mock endpoints in Requesto. Learn how paths, names, and modes work and how to manage endpoints from the sidebar.
---

# Creating & Managing Endpoints

An endpoint is a path on the mock server and the response, or set of responses, it gives back.

## Creating an Endpoint

When there are no endpoints yet, the Mock Server view shows a **Create Endpoint** button. Once you have some, click the **+** button in the sidebar header.

<ThemeImage src="/mock-server/empty-state.png" alt="Mock Server empty state with a Create Endpoint button" />

The **New Mock Endpoint** dialog asks for three things:

- **Mode**: [Static or Dynamic](/mock-server/#static-vs-dynamic)
- **Name**: a label for the sidebar, such as `Users API`
- **Path**: the URL path to serve, such as `/api/users`

<ThemeImage src="/mock-server/new-endpoint-static.png" alt="New Mock Endpoint dialog in static mode" />

Choose **Dynamic** if you want a full CRUD API instead of hand-written responses. The dialog explains each mode as you switch.

<ThemeImage src="/mock-server/new-endpoint-dynamic.png" alt="New Mock Endpoint dialog in dynamic mode" />

Paths must start with `/` and cannot include a query string. A segment starting with a colon, like `:id`, matches any value in that position. For example `/api/users/:id` matches `/api/users/1` and `/api/users/abc`.

After you create the endpoint it opens in the editor and is served straight away.

## Editing an Endpoint

You can change an endpoint's name, path, mode, and responses at any time. Changes are held as a draft until you save:

- An **Unsaved changes** indicator appears at the top of the editor.
- **Save** (or <kbd>Ctrl</kbd>+<kbd>S</kbd> / <kbd>Cmd</kbd>+<kbd>S</kbd>) applies the changes.
- **Revert** throws them away and goes back to the last saved version.

Dynamic data has its own **Save** button in the data pane, because records and endpoint settings are saved separately. See [Dynamic Endpoints](/mock-server/dynamic#editing-the-data).

## Managing Endpoints

The sidebar lists every endpoint with a **Static** or **Dynamic** badge, its name, and its path. Use the search box to filter by name or path.

Right-click an endpoint for more options:

<ThemeImage src="/mock-server/context-menu.png" alt="Endpoint context menu with Open, Disable, Duplicate, Clear Data, and Delete" />

- **Open**: show the endpoint in the editor
- **Disable / Enable**: a disabled endpoint is greyed out in the sidebar and returns `404` until you enable it again. Handy for testing how your app copes when a service goes missing
- **Duplicate**: create a copy named `<name> Copy`
- **Clear Data**: remove all records from a dynamic endpoint (dynamic only)
- **Delete**: remove the endpoint. Hovering an endpoint also reveals a trash icon that does the same

## Storage and Git

Mock data lives inside the active workspace, in two places:

```
.requesto/
├── mock-endpoints/        # One JSON file per endpoint (tracked by git)
└── local/
    └── mock-data/         # Dynamic datasets (excluded from git)
```

Endpoint definitions are tracked by git, so your team can share the same mock setup through a [git-enabled workspace](/features/git). Datasets are local only. Records created by test traffic never end up in a commit.

## Next Steps

- [Static Endpoints](/mock-server/static)
- [Dynamic Endpoints](/mock-server/dynamic)
