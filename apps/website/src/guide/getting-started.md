---
title: Getting Started
description: Send your first API request, save it to a collection, set up environment variables, and explore the Requesto interface - everything you need to get productive fast.
---

# Getting Started

::: tip Not Installed Yet?
Head to the [Download & Install](/guide/download) page first.
:::

## Make Your First Request

<ThemeImage src="/getting-started/blank-request-tab.png" alt="Blank request tab" />

1. Open Requesto - you'll see a blank request tab
2. Enter a URL in the address bar, e.g. `https://api.github.com/users/octocat`
3. Pick an HTTP method from the dropdown (defaults to GET)
4. Click **Send**
5. The response appears in the right (or bottom) panel with status code, time, size, and formatted body

<ThemeImage src="/getting-started/first-request.png" alt="First GET request with response" />

## Save It to a Collection

1. Click **Save**
2. Enter a name for the request
3. Select a collection (or create a new one)
4. Optionally choose a folder within the collection
5. The request now appears in the sidebar - click it anytime to reopen

<ThemeImage src="/getting-started/save-dialog.png" alt="Save request dialog" />

## Set Up Environment Variables

Environments let you swap between configs (dev, staging, prod) without editing requests.

1. Open the **environment selector** in the tabs bar and choose **Manage Environments** (gear icon)
2. Create a new environment (e.g. "Development")
3. Add variables as key-value pairs:
   - `base_url` → `http://localhost:3000`
   - `api_key` → `your-key-here`
4. Select the environment from the dropdown in the tabs bar
5. Use variables in requests with <code v-pre>{{base_url}}</code> syntax - they're substituted before sending

Variables work in URLs, headers, query parameters, request bodies, form-data entries, and auth fields.

## Organize with Folders

Right-click a collection in the sidebar to create folders. Drag and drop requests between folders to reorganize.

```
My API
  Auth
    Login
    Refresh Token
  Users
    Get User
    Create User
```

## Set Up OAuth 2.0

1. Open a request's **Auth** tab and select **OAuth 2.0**
2. Click **New** (or **Manage** → **New Config**) to open the configuration wizard
3. Fill in your provider details (client ID, auth URL, token URL, etc.)
4. Client secrets are stored server-side in the workspace's `.requesto/local/` folder and never exposed to the browser
5. Click **Authenticate** to run the OAuth flow
6. Select your saved config in any request's Auth tab

See [OAuth 2.0](/features/oauth) for the full guide.

## Interface Layout

<ThemeImage src="/getting-started/interface-overview.png" alt="Full interface overview" />

**Header**: Workspace switcher, settings (gear icon), theme toggle, console toggle, layout toggle (horizontal/vertical split), sidebar toggle, update badge, and help. Requesto is a single-page app - there's no page navigation.

**Sidebar** (left): Your collections, folders, and saved requests, plus an environments panel. Search box filters by name and URL.

**Tabs bar**: Open request tabs. An orange dot means unsaved changes. The environment selector (with its gear icon for managing environments) is here too.

**Request panel**: URL bar, method dropdown, and tabs for Params, Headers, Body (Monaco editor), Auth, Tests, and Pre-request Script.

**Response panel**: Status code, response time, size. Tabs for response Body (formatted), Headers, and Test Results.

**Console panel** (bottom, toggleable): Shows request/response logs grouped by request, with expandable details and copy-to-clipboard.

## Next Steps

- [Workspaces](/features/workspaces)
- [Collections & Folders](/features/collections)
- [Environments](/features/environments)
- [Git Integration](/features/git)
- [OpenAPI Import & Sync](/features/openapi)
- [OAuth 2.0](/features/oauth)
- [Docker Deployment](/deployment/docker)
