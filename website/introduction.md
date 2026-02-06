# What is Requesto?

Requesto is a **self-hosted, privacy-focused API client** designed for developers who need complete control over their testing environment.

## The Problem

Modern API development tools often:
- Store your requests and API keys in the cloud
- Track your usage and send telemetry
- Require subscriptions for basic features
- Lock you into proprietary formats

## The Solution

Requesto gives you:

### Complete Privacy
Your data never leaves your infrastructure. All collections, environments, and request history are stored locally on your machine or server.

### Open Source
MIT licensed - audit the code, extend features, contribute improvements. No vendor lock-in.

### Self-Hosted
Run it anywhere:
- **Desktop app** for local development
- **Docker container** for team deployments
- **From source** for complete customization

### Full-Featured
Everything you need for API development:
- Collections with folders and drag-and-drop organization
- Environment variables with `{{variable}}` substitution
- OAuth 2.0 with automatic token refresh
- Request history with search and replay
- Multiple authentication methods
- Server-Sent Events (SSE) support

## Who is Requesto for?

### Individual Developers
Test APIs locally without sending data to third-party services. Perfect for working with sensitive endpoints.

### Development Teams
Self-host for your team with shared collections via Git. No per-seat licensing.

### Security-Conscious Organizations
Keep API credentials within your network perimeter. Audit all requests locally.

### Open Source Projects
Document and share API examples with users without requiring external accounts.

## Architecture

Requesto is built as a modern monorepo with three components:

```
Frontend (React/Vite) ← → Backend Proxy (Node.js/Fastify) ← → External APIs
                      ↓
              Electron Wrapper (Desktop)
```

- **Frontend:** React with TailwindCSS for a clean, responsive UI
- **Backend:** Fastify proxy that handles CORS and variable substitution
- **Electron:** Optional desktop wrapper for native experience

All data is stored in JSON files with atomic writes for reliability.

## Comparison

| Feature | Requesto | Postman | Insomnia |
|---------|----------|---------|----------|
| Self-Hosted | Yes | No | No |
| Open Source | Yes | No | Yes (partially) |
| No Cloud Required | Yes | No | No |
| Collections | Yes | Yes | Yes |
| Environments | Yes | Yes | Yes |
| OAuth 2.0 | Yes | Yes | Yes |
| Request History | Yes | Yes | Yes |
| Team Collaboration | Git-based | Cloud | Cloud |
| Pricing | Free | Freemium | Freemium |

## Technology Stack

- **Frontend:** React 18, TypeScript, TailwindCSS, Zustand
- **Backend:** Node.js, Fastify, TypeScript
- **Desktop:** Electron
- **Deployment:** Docker, native installers
- **Storage:** JSON files (no database required)

## Next Steps

- [Get Started →](/getting-started)
- [Download Requesto →](/download)
- [View on GitHub →](https://github.com/t3rr11/Requesto)
