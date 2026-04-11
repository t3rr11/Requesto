# What is Requesto?

Requesto is an open-source API client that runs locally on your machine or on your own server. It stores everything in plain JSON files - no cloud, no accounts, no telemetry.

You can run it as a desktop app (Electron), in Docker, or straight from source.

## What it does

- Send HTTP requests (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- Organize requests into collections and folders with drag-and-drop
- Define environment variables and swap between them (dev, staging, prod)
- Authenticate with Basic, Bearer, API Key, Digest, or OAuth 2.0
- Stream Server-Sent Events (SSE)
- View request/response logs in a built-in console panel

All requests go through a local backend proxy (Fastify), which handles CORS and substitutes environment variables before sending the request to the target API.

## How it's built

```
Frontend (React/Vite) ←→ Backend Proxy (Fastify) ←→ External APIs
        ↓
Electron Wrapper (Desktop)
```

- **Frontend**: React, TypeScript, TailwindCSS, Zustand for state management
- **Backend**: Node.js with Fastify - proxies requests, stores data, handles OAuth token exchange
- **Desktop**: Electron wrapper that bundles the backend as a child process
- **Storage**: JSON files on disk (`collections.json`, `environments.json`, `history.json`, `oauth-configs.json`). No database.

Data writes use a temp-file + rename pattern to avoid corruption.

## Why it's built this way

The goal is to be easy to self-host. Whether you run it as a desktop app or deploy it in Docker, there's no database to set up or maintain - just JSON files in a data directory. Back up by copying a folder, restore by putting it back.

The backend proxy only exists so the frontend doesn't have to deal with CORS or expose secrets like OAuth client credentials to the browser and that's it's whole purpose.

## Next Steps

- [Get Started](/guide/getting-started)
- [Download](/guide/download)
- [GitHub](https://github.com/t3rr11/Requesto)
