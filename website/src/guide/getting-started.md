# Getting Started

::: tip Not Installed Yet?
Head to the [Download & Install](/guide/download) page first.
:::

## Make Your First Request

1. Open Requesto - you'll see a blank request tab
2. Enter a URL in the address bar, e.g. `https://api.github.com/users/octocat`
3. Pick an HTTP method from the dropdown (defaults to GET)
4. Click **Send**
5. The response appears in the right (or bottom) panel with status code, time, size, and formatted body

## Save It to a Collection

1. Click **Save**
2. Enter a name for the request
3. Select a collection (or create a new one)
4. Optionally choose a folder within the collection
5. The request now appears in the sidebar - click it anytime to reopen

## Set Up Environment Variables

Environments let you swap between configs (dev, staging, prod) without editing requests.

1. Go to the **Environments** page via the header navigation
2. Create a new environment (e.g. "Development")
3. Add variables as key-value pairs:
   - `base_url` → `http://localhost:3000`
   - `api_key` → `your-key-here`
4. Select the environment from the dropdown in the tabs bar
5. Use variables in requests with <code v-pre>{{base_url}}</code> syntax - they're substituted before sending

Variables work in URLs, headers, query parameters, and request bodies.

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

1. Go to the **OAuth 2.0** page via the header
2. Click **New Configuration**
3. Fill in your provider details (client ID, auth URL, token URL, etc.)
4. Client secrets are stored server-side and never exposed to the browser
5. Click **Authorize** to run the OAuth flow
6. In any request's Auth tab, select OAuth 2.0 and choose your config

## Interface Layout

**Header**: Navigation between Requests, Environments, and OAuth pages. Also has theme toggle, console toggle, layout toggle (horizontal/vertical split), sidebar toggle, and help.

**Sidebar** (left): Your collections, folders, and saved requests. Search box at the top filters by name and URL.

**Tabs bar**: Open request tabs. An orange dot means unsaved changes. The environment selector dropdown is here too.

**Request panel**: URL bar, method dropdown, and tabs for Params, Headers, Body (Monaco editor), and Auth.

**Response panel**: Status code, response time, size. Tabs for response Body (formatted), Headers, and Test Results.

**Console panel** (bottom, toggleable): Shows request/response logs grouped by request, with expandable details and copy-to-clipboard.

## Next Steps

- [Collections & Folders](/features/collections)
- [Environments](/features/environments)
- [OAuth 2.0](/features/oauth)
- [Docker Deployment](/deployment/docker)
