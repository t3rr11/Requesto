# Getting Started with Requesto

Welcome to Requesto! This guide will help you get up and running quickly.

## Installation

### Option 1: Desktop Application (Easiest)

1. Download the installer for your platform from [Releases](https://github.com/yourusername/Requesto/releases)
2. Run the installer
3. Launch Requesto from your applications menu

**Available Platforms:**
- Windows: `.exe` installer or portable
- macOS: `.dmg` installer
- Linux: `.AppImage` or `.deb`

### Option 2: Docker

```bash
git clone https://github.com/yourusername/requesto.git
cd requesto
docker-compose up
```

Access at: http://localhost:4000

### Option 3: From Source

```bash
git clone https://github.com/yourusername/requesto.git
cd requesto
npm install
npm run dev
```

Access at: http://localhost:5173

## Quick Tutorial

### 1. Make Your First Request

1. Enter a URL (e.g., `https://api.github.com/users/octocat`)
2. Select HTTP method (GET, POST, etc.)
3. Click "Send" or press `Ctrl/Cmd + Enter`
4. View the response below

### 2. Save a Request

1. After sending a request, click "Save"
2. Enter a name and select/create a collection
3. The request is now saved for later use

### 3. Use Environment Variables

1. Go to "Environments" tab
2. Click "New Environment"
3. Add variables (e.g., `base_url: https://api.example.com`)
4. Use in requests: `{{base_url}}/endpoint`

### 4. Organize with Collections

Collections help organize related requests:

1. Create a collection (e.g., "GitHub API")
2. Add folders (e.g., "Users", "Repos")
3. Save requests to folders
4. Drag and drop to reorganize

### 5. Configure OAuth 2.0

For APIs requiring OAuth:

1. Go to "OAuth 2.0" tab
2. Click "New Configuration"
3. Enter OAuth details (client ID, secret, etc.)
4. Use in request authentication

## Interface Overview

### Header Bar
- **Logo**: Click to return to main view
- **Navigation**: Requests, Environments, OAuth 2.0
- **Theme Toggle**: Switch between light/dark mode
- **Console**: View request logs and errors
- **Help**: Keyboard shortcuts reference

### Sidebar (Requests Page)
- View all collections and requests
- Create new collections/folders
- Drag-and-drop organization
- Right-click for context menu
- Toggle with `Ctrl/Cmd + B`

### Request Panel
- **URL Bar**: Enter request URL
- **Method**: Select HTTP method
- **Tabs**: Headers, Params, Body, Auth
- **Send Button**: Execute request (`Ctrl/Cmd + Enter`)

### Response Panel
- **Status**: HTTP status code and time
- **Tabs**: Body, Headers, Console
- **Body Viewer**: Syntax-highlighted JSON/XML/HTML
- **Copy/Download**: Export response data

### Tabs Bar
- Multiple request tabs
- Close with `X` or `Ctrl/Cmd + W`
- Switch with `Ctrl/Cmd + 1-9`
- Dirty indicator for unsaved changes

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + T` | New request tab |
| `Ctrl/Cmd + W` | Close current tab |
| `Ctrl/Cmd + Enter` | Send request |
| `Ctrl/Cmd + S` | Save request |
| `Ctrl/Cmd + B` | Toggle sidebar |
| `Ctrl/Cmd + 1-9` | Switch to tab 1-9 |
| `Ctrl/Cmd + Tab` | Next tab |
| `Ctrl/Cmd + Shift + Tab` | Previous tab |
| `?` | Show help |

## Common Tasks

### Adding Headers

1. Go to "Headers" tab
2. Click "Add Header"
3. Enter key and value
4. Toggle checkbox to enable/disable

**Common Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer <token>`
- `Accept: application/json`

### Sending JSON Body

1. Select POST/PUT/PATCH method
2. Go to "Body" tab
3. Select "JSON" format
4. Enter JSON data
5. Send request

### Using Variables

Variables from active environment are available with `{{variable}}` syntax:

```
URL: {{base_url}}/users/{{user_id}}
Header: Authorization: Bearer {{token}}
Body: { "api_key": "{{api_key}}" }
```

### Authentication

#### Basic Auth
1. Go to "Auth" tab
2. Select "Basic"
3. Enter username and password

#### Bearer Token
1. Go to "Auth" tab
2. Select "Bearer"
3. Enter token

#### OAuth 2.0
1. Configure OAuth in "OAuth 2.0" tab
2. In request, select "OAuth 2.0"
3. Choose configuration
4. Token automatically refreshed

## Tips & Tricks

### 1. Bulk Header Import
Paste multiple headers at once:
```
Content-Type: application/json
Authorization: Bearer token123
X-Custom-Header: value
```

### 2. Response Search
Use `Ctrl/Cmd + F` in response body to search

### 3. History
All requests are automatically saved in history

### 4. Dark Mode
Dark mode is easier on eyes during long sessions

### 5. Console
Check console for detailed logs, errors, and timing

## Troubleshooting

### Request Fails with CORS Error
Requesto uses a backend proxy to avoid CORS. If you still see CORS errors:
1. Ensure backend is running (desktop app handles this)
2. Check if API allows requests from `localhost`
3. Try using the desktop app instead of web version

### OAuth Not Working
1. Verify OAuth configuration is correct
2. Check redirect URI matches OAuth provider
3. Ensure client ID and secret are valid
4. Check OAuth provider logs

### Variables Not Substituting
1. Verify environment is activated (selected in header)
2. Check variable name matches exactly (case-sensitive)
3. Ensure variable is enabled in environment

### Desktop App Won't Start
1. Check if port 4000 is available
2. Try running as administrator (Windows)
3. Check application logs in:
   - Windows: `%APPDATA%\requesto-electron\logs`
   - macOS: `~/Library/Logs/requesto-electron`
   - Linux: `~/.config/requesto-electron/logs`

## Data Location

User data (collections, environments, history) is stored at:

- **Desktop App (Windows)**: `%APPDATA%\requesto-electron\data`
- **Desktop App (macOS)**: `~/Library/Application Support/requesto-electron/data`
- **Desktop App (Linux)**: `~/.config/requesto-electron/data`
- **Docker**: `/app/apps/backend/data` (or mounted volume)
- **From Source**: `apps/backend/data`

## Next Steps

- Read [Documentation](README.md)
- Check [Deployment Guide](docs/DEPLOYMENT.md) for production setup
- View [Contributing Guide](CONTRIBUTING.md) to contribute
- Report issues on [GitHub](https://github.com/yourusername/Requesto/issues)

## Getting Help

- 📖 [Documentation](README.md)
- 💬 [GitHub Discussions](https://github.com/yourusername/Requesto/discussions)
- 🐛 [Report Bug](https://github.com/yourusername/Requesto/issues)
- 💡 [Request Feature](https://github.com/yourusername/Requesto/issues)

---

Happy testing! 🚀



