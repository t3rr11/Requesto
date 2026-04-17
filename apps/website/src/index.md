---
layout: home

hero:
  name: Requesto
  text: Local API Client
  tagline: A self-hostable API client. No accounts, no cloud, no telemetry.
  image:
    light: /logo-blue.svg
    dark: /logo.svg
    alt: Requesto Logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Install with Docker
      link: /deployment/docker
    - theme: alt
      text: GitHub
      link: https://github.com/t3rr11/Requesto

features:
  - title: Self-Hosted
    details: All data is stored locally in JSON files - on your machine or your server. No accounts, no cloud sync, no telemetry.

  - title: Workspaces
    details: Isolate projects into separate workspaces, each with their own collections, environments, and OAuth configs. Switch between them instantly.

  - title: Git Integration
    details: Built-in git support for workspaces. Commit, push, pull, and resolve conflicts without leaving the app. Clone repositories as new workspaces.

  - title: Collections & Folders
    details: Organize requests into collections and folders with drag-and-drop. Import and export as JSON, or import from Postman.

  - title: OpenAPI Import & Sync
    details: Import OpenAPI v2/v3 specs to auto-generate collections. Link a spec and sync changes as the API evolves.

  - title: Environment Variables
    details: Define variables per environment and reference them in URLs, headers, and bodies. Switch environments instantly.

  - title: OAuth 2.0
    details: Supports authorization code (with PKCE), client credentials, implicit, and password grant flows. Client secrets stay server-side.

  - title: Console Logging
    details: Every request and response is logged in the console panel with status codes, timing, and full payloads.

  - title: Dark Mode
    details: Dark-mode-first UI with a light mode toggle. Built with React and TailwindCSS.
---

<div class="hero-image">
  <ThemeImage src="/home/hero-screenshot.png" alt="Hero image" />
</div>

## Quick Start

### Desktop App

Download for Windows, macOS, or Linux from the [releases page](https://github.com/t3rr11/Requesto/releases).

[Read more about desktop deployments](./deployment/desktop.html)

### Docker

```bash
docker run -d \
  -p 4000:4000 \
  -v requesto-data:/app/data \
  terrii/requesto:latest
```

[Read more about docker deployments](./deployment/docker.html)

### From Source

```bash
git clone https://github.com/t3rr11/Requesto.git
cd Requesto
npm install
npm run dev
```

[Read more source deployments](./deployment/building.html)
