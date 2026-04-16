# Building from Source

## Prerequisites

- Node.js 20+
- npm
- Git

## Setup

```bash
git clone https://github.com/t3rr11/Requesto.git
cd Requesto
npm install
```

This installs dependencies for all three apps (backend, frontend, electron) via npm workspaces.

## Project Structure

```
Requesto/
├── apps/
│   ├── backend/      # Fastify backend server (port 4000)
│   ├── frontend/     # React/Vite UI (port 5173 in dev)
│   ├── electron/     # Electron desktop wrapper
│   ├── website/      # VitePress documentation site
│   └── playwright/   # End-to-end tests
└── package.json      # Root workspace config
```

## Development

```bash
npm run dev              # Backend + frontend (ports 4000 & 5173)
npm run dev:electron     # All three with Electron window
npm run dev:backend      # Backend only
npm run dev:frontend     # Frontend only
```

Frontend and backend both hot-reload on file changes.

## Production Build

```bash
npm run build            # Build all apps
npm run build:backend    # Backend only → apps/backend/dist/
npm run build:frontend   # Frontend only → apps/frontend/dist/
```

## Packaging the Desktop App

```bash
npm run package:electron:win     # Windows (.exe installer + portable)
npm run package:electron:mac     # macOS (.dmg)
npm run package:electron:linux   # Linux (.AppImage, .deb, .rpm)
```

Output goes to `apps/electron/dist/`.

## Docker

```bash
docker build -t requesto:custom .
docker run -d -p 4000:4000 -v requesto-data:/app/data requesto:custom
```

Or with Compose:

```bash
docker-compose up --build
```

## Troubleshooting

**Node version** - Make sure you're on Node.js 20+: `node --version`

**Clean reinstall** - If builds break: `rm -rf node_modules apps/*/node_modules && npm install`

**Port conflict** - Backend uses port 4000, frontend dev server uses 5173. Change in `apps/backend/src/server.ts` or `apps/frontend/vite.config.ts`.

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Backend + frontend dev servers |
| `npm run dev:electron` | All three with Electron window |
| `npm run build` | Build all apps for production |
| `npm run package:electron:win` | Windows installer |
| `npm run package:electron:mac` | macOS dmg |
| `npm run package:electron:linux` | Linux packages |
| `docker-compose up --build` | Build and run Docker image |
