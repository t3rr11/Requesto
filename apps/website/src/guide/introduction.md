---
title: What is Requesto?
description: Requesto is an open-source API client that runs locally or on your own server. No cloud, no accounts, no telemetry. Supports Docker, Electron, and source builds.
---

# What is Requesto?

Requesto is an open-source API client that runs locally on your machine or on your own server. It stores everything in plain JSON files - no cloud, no accounts, no telemetry.

You can run it as a desktop app (Electron), in Docker, or straight from source.

<ThemeImage src="/introduction/app-overview.png" alt="Requesto app overview" />

## What it does

- Send HTTP requests (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- Organize requests into collections and folders with drag-and-drop
- Define environment variables and swap between them (dev, staging, prod)
- Authenticate with Basic, Bearer, API Key, Digest, or OAuth 2.0
- Import OpenAPI v2/v3 specs and keep collections in sync as the spec changes
- Import and export Postman collections and environments
- Manage multiple workspaces to isolate different projects
- Version control workspace data with built-in git integration
- Stream Server-Sent Events (SSE)
- View request/response logs in a built-in console panel

The backend handles CORS, substitutes environment variables, and manages all data storage so the frontend never has to deal with cross-origin restrictions or file I/O.

## How it's built

```
Frontend (React/Vite) ←→ Backend (Fastify) ←→ External APIs
        ↓
Electron Wrapper (Desktop)
```

- **Frontend**: React, TypeScript, TailwindCSS, Zustand for state management
- **Backend**: Node.js with Fastify - manages collections, environments, workspaces, git operations, OpenAPI importing, request execution, and OAuth token exchange
- **Desktop**: Electron wrapper that bundles the backend as a child process
- **Storage**: JSON files on disk organized by workspace. No database.

```
data/
├── workspaces.json         # Workspace registry and active workspace
├── Default/                # Default workspace
│   ├── collections.json    # Collections, folders, and saved requests
│   ├── environments.json   # Environments and variables
│   ├── oauth-configs.json  # OAuth configurations (no client secrets)
│   └── .requesto/          # Local-only data (excluded from git)
│       ├── history.json
│       └── oauth-secrets.json
└── workspaces/             # Additional workspaces (including git clones)
```

Data writes use a temp-file + rename pattern to avoid corruption.

## Why it's built this way

The goal is to be easy to self-host. Whether you run it as a desktop app or deploy it in Docker, there's no database to set up or maintain - just JSON files in a data directory. Back up by copying a folder, restore by putting it back.

Each workspace is its own directory, so different projects stay isolated. Workspaces that are git repositories can be committed, pushed, and pulled directly from the UI, making it straightforward to share API collections across a team without any external sync service.

## Next Steps

- [Get Started](/guide/getting-started)
- [Download](/guide/download)
- [GitHub](https://github.com/t3rr11/Requesto)
