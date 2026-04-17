---
title: Security
description: How Requesto handles your data - local-only storage, no telemetry, no outbound requests, Electron security hardening, and vulnerability reporting.
---

# Security

How Requesto handles your data and what to be aware of when deploying it.

## What Requesto Does

- Stores all data locally in JSON files - no cloud, no external database
- Makes no outbound network requests except to the API endpoints you explicitly test
- Sends no telemetry or analytics
- Is fully open source (MIT) - you can audit the code

## Data Storage

All data lives in plain JSON files on disk, organized by workspace:

```
data/
├── workspaces.json           # Workspace registry and active workspace
├── Default/                  # Default workspace
│   ├── collections.json      # Collections, folders, and saved requests
│   ├── environments.json     # Environments and variable values
│   ├── oauth-configs.json    # OAuth configurations (no client secrets)
│   └── .requesto/            # Local-only data (excluded from git)
│       ├── history.json      # Last 100 request/response records
│       └── oauth-secrets.json # OAuth client secrets
└── workspaces/               # Additional workspaces (including git clones)
```

**Data locations:**
- **Desktop (Windows)**: `%APPDATA%\requesto-electron\data`
- **Desktop (macOS)**: `~/Library/Application Support/requesto-electron/data`
- **Desktop (Linux)**: `~/.config/requesto-electron/data`
- **Docker**: `/app/data` (mount a volume for persistence)

### What's stored in plaintext

- Environment variable values (API keys, tokens, etc.)
- OAuth client secrets (server-side in `.requesto/oauth-secrets.json`, excluded from git)
- Request/response history including headers and bodies
- Saved request authentication configs

There is no built-in encryption at rest. If your data directory contains sensitive credentials, use OS-level or volume-level encryption to protect it.

### What's kept separate

- OAuth **client secrets** are stored in the `.requesto/` directory, which is excluded from git via auto-generated `.gitignore`. They are never sent to the frontend.
- OAuth **access tokens** are stored client-side (in sessionStorage or localStorage, depending on your config) and are never persisted server-side
- Request **history** is stored in `.requesto/` so it stays local and is not committed to version control

## Electron Security

The desktop app uses Electron with these settings:

- **Context isolation** enabled - renderer can't access Node.js APIs
- **Node integration** disabled - web content is sandboxed
- **Web security** enabled
- **Preload script** uses `contextBridge` for controlled IPC
- **External links** open in the default browser, not in the app window

## Network

- The desktop app makes no inbound connections
- Docker deployments expose only the configured port (default 4000)
- The only outbound connections are to the API endpoints you send requests to and OAuth provider URLs during token exchange

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
        proxy_pass http://localhost:4000;
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
