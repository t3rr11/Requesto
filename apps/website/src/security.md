---
title: Security
description: How Requesto handles your data - local-only storage, no telemetry, no outbound requests, Electron security hardening, and vulnerability reporting.
---

# Security

How Requesto handles your data and what to be aware of when deploying it.

## What Requesto Does

- Runs entirely on your machine - the web client and API server are bundled together and talk to each other locally
- Stores all data locally in JSON files - no cloud, no external database
- Makes no outbound network requests except to the API endpoints you explicitly test
- Sends no telemetry or analytics
- Is fully open source (MIT) - you can audit the code

## Data Storage

All data lives in plain JSON files on disk, organized by workspace. Each workspace keeps its data inside a `.requesto/` folder:

```
data/
├── workspaces.json                       # Workspace registry and active workspace
├── Default/                              # Built-in workspace (named "Local Workspace")
│   └── .requesto/                        # Requesto data for this workspace (git-tracked)
│       ├── .gitignore                    # Auto-generated - ignores local/
│       ├── order.json                    # Display order of collections, environments, and configs
│       ├── collections/                  # One JSON file per collection
│       ├── environments/                 # One JSON file per environment (initial values)
│       ├── oauth-configs/                # One JSON file per OAuth configuration (no secrets)
│       ├── graphql-schemas/              # One JSON file per GraphQL schema profile
│       └── local/                        # Local-only data (excluded from git)
│           ├── history.json              # Last 100 request/response records
│           ├── environments.local.json   # Current environment variable values
│           ├── active-environment.json   # Your active environment selection
│           ├── oauth-secrets.json        # OAuth client secrets
│           └── oauth-tokens.json         # OAuth access/refresh tokens
└── workspaces/                           # Additional workspaces (created or git-cloned)
```

Older layouts (data files at the workspace root, local files directly inside `.requesto/`, or the previous monolithic `collections.json`/`environments.json`/`oauth-configs.json`/`graphql-schemas.json` files) are migrated automatically the next time the app starts.

**Data locations:**
- **Desktop (Windows)**: `%APPDATA%\requesto-electron\data`
- **Desktop (macOS)**: `~/Library/Application Support/requesto-electron/data`
- **Desktop (Linux)**: `~/.config/requesto-electron/data`
- **Docker**: `/app/data` (mount a volume for persistence)

### What's stored in plaintext

- Environment variable values (API keys, tokens, etc.) and their current values
- OAuth client secrets (server-side in `.requesto/local/oauth-secrets.json`, excluded from git)
- OAuth access and refresh tokens (server-side in `.requesto/local/oauth-tokens.json`, excluded from git)
- Request/response history including headers and bodies
- Saved request authentication configs

There is no built-in encryption at rest. If your data directory contains sensitive credentials, use OS-level or volume-level encryption to protect it.

### What's kept separate

- OAuth **client secrets** are stored in `.requesto/local/oauth-secrets.json`, which is excluded from git via the auto-generated `.requesto/.gitignore`. They are never sent to the frontend.
- OAuth **access and refresh tokens** are persisted server-side in `.requesto/local/oauth-tokens.json` (also excluded from git). The frontend only receives a non-secret token status (such as expiry and a preview) - tokens themselves never reach the browser.
- Request **history** is stored in `.requesto/local/history.json` so it stays local and is not committed to version control.
- Environment **current values** (the values written at runtime, e.g. by pre-request scripts) live in `.requesto/local/environments.local.json`, separate from the initial values committed in `.requesto/environments/`.
- Your **active environment** selection is stored locally in `.requesto/local/active-environment.json` and is not committed. A fresh clone defaults to the first environment in the workspace order — make an environment the workspace default by moving it to the top.

Everything in `.requesto/local/` is gitignored automatically; the rest of `.requesto/` (collections, environments, OAuth configs) is what gets committed when you use Requesto's git features.

## Electron Security

The desktop app uses Electron with these settings:

- **Context isolation** enabled - renderer can't access Node.js APIs
- **Node integration** disabled - web content is sandboxed
- **Web security** enabled
- **Preload script** uses `contextBridge` for controlled IPC
- **External links** open in the default browser, not in the app window

## Network

- The desktop app makes no inbound connections - its backend binds to `localhost` only
- Docker deployments expose only the configured port (default 4747)
- The only outbound connections are:
  - The API endpoints you send requests to
  - OAuth provider URLs during token exchange
  - Git remotes, when you clone, push, or pull a workspace (desktop and web, only when you use git features)
  - GitHub releases, from the desktop app, to check for updates

## Authentication

Requesto itself has **no built-in user authentication**. Anyone who can reach the web UI can use it.

For shared deployments, put it behind a reverse proxy with auth:

```nginx
server {
    listen 80;
    server_name requesto.internal.example.com;

    auth_basic "Requesto";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        proxy_pass http://localhost:4747;
    }
}
```

Or deploy on an internal network / behind a VPN.

## Atomic Writes

All file writes use a temp-file + rename pattern to prevent corruption if the process crashes mid-write.

## Dependency Auditing

Run `npm audit` to check for known vulnerabilities in dependencies.

## Vulnerability Reporting

See [SECURITY.md](https://github.com/t3rr11/Requesto/blob/main/SECURITY.md) on GitHub for the vulnerability disclosure policy.
