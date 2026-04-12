# Requesto

A self-hostable API client. No accounts, no cloud, no telemetry.

| Light Mode | Dark Mode |
|-----------|------------|
| ![Requesto Light Mode](images/example-light.png) | ![Requesto Dark Mode](images/example-dark.png) | 

## Features

- **Self-hosted**: All data stored locally in JSON files - on your machine or your server
- **Full HTTP support**: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- **Authentication**: Basic, Bearer, API Key, Digest, and OAuth 2.0 (Authorization Code, PKCE, Client Credentials, Implicit, Password)
- **Environment variables**: Define variables per environment and reference them in URLs, headers, and bodies
- **Collections & folders**: Organize requests with drag-and-drop, import and export as JSON
- **Console logging**: Request/response logs with status codes, timing, and full payloads
- **Dark/Light themes**: Dark-mode-first UI with a light mode toggle
- **CORS-free**: Backend proxy eliminates CORS issues
- **SSE support**: Stream Server-Sent Events endpoints
- **Multiple deployment options**: Desktop app (Windows/macOS/Linux), Docker, or from source

## Quick Start

### Desktop App

Download for Windows, macOS, or Linux from the [releases page](https://github.com/t3rr11/Requesto/releases).

- **Windows**: `.exe` installer or portable
- **macOS**: `.dmg`
- **Linux**: `.AppImage`, `.deb`, `.rpm`

### Docker

```bash
docker run -d \
  -p 4000:4000 \
  -v requesto-data:/app/data \
  terrii/requesto:latest
```

Open [http://localhost:4000](http://localhost:4000).

Or with Docker Compose:

```bash
docker-compose up -d
```

### From Source

```bash
git clone https://github.com/t3rr11/Requesto.git
cd Requesto
npm install
npm run dev
```

Backend runs on port 4000, frontend dev server on port 5173.

## Development

### Prerequisites

- Node.js 20+
- npm
- Git

### Project Structure

```
Requesto/
├── apps/
│   ├── backend/      # Fastify proxy server (port 4000)
│   ├── frontend/     # React/Vite UI (port 5173 in dev)
│   └── electron/     # Electron desktop wrapper
└── package.json      # Root workspace config
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Backend + frontend dev servers |
| `npm run dev:electron` | All three with Electron window |
| `npm run build` | Build all apps for production |
| `npm run build:backend` | Build backend only |
| `npm run build:frontend` | Build frontend only |
| `npm run package:electron:win` | Windows installer |
| `npm run package:electron:mac` | macOS dmg |
| `npm run package:electron:linux` | Linux packages |
| `docker-compose up --build` | Build and run Docker image |

## Architecture

```
Frontend (React/Vite) ←→ Backend Proxy (Fastify) ←→ External APIs
        ↓
Electron Wrapper (Desktop)
```

- **Frontend**: React, TypeScript, Vite, TailwindCSS, Zustand
- **Backend**: Node.js with Fastify - proxies requests, stores data, handles OAuth token exchange
- **Desktop**: Electron wrapper that bundles the backend as a child process
- **Storage**: JSON files on disk (`collections.json`, `environments.json`, `history.json`, `oauth-configs.json`) - no database

## Documentation

Full documentation is available at [requesto.com.au](https://requesto.com.au).

- **[Introduction](https://requesto.com.au/guide/introduction)** - What Requesto is and how it works
- **[Getting Started](https://requesto.com.au/guide/getting-started)** - First request, collections, environments
- **[Download & Install](https://requesto.com.au/guide/download)** - Desktop, Docker, and source installation
- **[Docker Deployment](https://requesto.com.au/deployment/docker)** - Compose files, environment variables, reverse proxy
- **[Building from Source](https://requesto.com.au/deployment/building)** - Development setup and packaging
- **[Security](SECURITY.md)** - Security policy and vulnerability reporting

## Disclosure
AI was used to assist development.

## License

MIT

