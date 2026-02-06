# Getting Started

Now that you have Requesto installed, let's get you up and running in minutes.

::: tip Not Installed Yet?
Head to the [Download & Install](/download) page to set up Requesto first.
:::

## Quick Tutorial

### 1. Make Your First Request

1. Enter a URL in the address bar (try `https://api.github.com/users/octocat`)
2. Select the HTTP method (GET, POST, PUT, DELETE, etc.)
3. Click **Send** or press `Ctrl/Cmd + Enter`
4. View the response in the panel below

![First Request](../public/screenshots/first-request.png)

### 2. Save Requests to Collections

Keep your requests organized:

1. After sending a request, click **Save**
2. Enter a name for the request
3. Select an existing collection or create a new one
4. Optionally place it in a folder

Your saved requests appear in the sidebar for quick access.

### 3. Use Environment Variables

Manage different environments (dev, staging, production):

1. Navigate to the **Environments** tab
2. Click **New Environment**
3. Add variables:
   ```
   base_url = https://api.example.com
   api_key = your-api-key
   ```
4. Use in requests with `{{base_url}}/endpoint`

Variables are substituted before the request is sent.

### 4. Organize with Collections & Folders

Create structure for complex APIs:

```
My API
  Authentication
    Login
    Refresh Token
  Users
    Get User
    Create User
    Update User
```

Drag and drop to reorganize. Right-click for more options.

### 5. Configure OAuth 2.0

For APIs requiring OAuth authentication:

1. Go to **OAuth 2.0** tab
2. Click **New Configuration**
3. Enter OAuth details:
   - Client ID & Secret
   - Authorization & Token URLs
   - Grant type (authorization code, client credentials, etc.)
4. Use the config in request authentication

Tokens are automatically refreshed when enabled.

---

## Interface Overview

### Header Bar
- **Navigation**: Switch between Requests, Environments, and OAuth 2.0
- **Theme Toggle**: Dark/light mode
- **Console**: View request logs and debug info
- **Help**: Keyboard shortcuts reference

### Sidebar
- View collections, folders, and saved requests
- Toggle with `Ctrl/Cmd + B`
- Drag-and-drop to reorganize
- Right-click for context menu

### Request Panel
- **URL Bar**: Enter endpoint with variable support
- **Method Selector**: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
- **Tabs**:
  - **Params**: Query parameters
  - **Headers**: HTTP headers
  - **Body**: JSON, form data, raw text, etc.
  - **Auth**: Basic, Bearer, API Key, OAuth 2.0

### Response Panel
- **Status**: HTTP status code and response time
- **Body**: Formatted JSON, XML, HTML, or raw text
- **Headers**: Response headers
- **Console**: Request/response logs

---

## Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|--------------|-------|
| Send Request | `Ctrl + Enter` | `Cmd + Enter` |
| New Request | `Ctrl + N` | `Cmd + N` |
| Save Request | `Ctrl + S` | `Cmd + S` |
| Toggle Sidebar | `Ctrl + B` | `Cmd + B` |
| Focus URL Bar | `Ctrl + L` | `Cmd + L` |
| Toggle Console | `Ctrl + ~` | `Cmd + ~` |

---

## Next Steps

- [Explore Features →](/features/collections)
- [Deploy with Docker →](/deployment)
- [Configure OAuth →](/features/oauth)
