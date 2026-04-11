---
layout: home

hero:
  name: Requesto
  text: Local API Client
  tagline: A self-hostable API client. No accounts, no cloud, no telemetry.
  image:
    src: /logo.svg
    alt: Requesto Logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Download
      link: /guide/download
    - theme: alt
      text: GitHub
      link: https://github.com/t3rr11/Requesto

features:
  - title: Self-Hosted
    details: All data is stored locally in JSON files - on your machine or your server. No accounts, no cloud sync, no telemetry.

  - title: Collections & Folders
    details: Organize requests into collections and folders with drag-and-drop. Import and export as JSON.

  - title: Environment Variables
    details: Define variables per environment and reference them in URLs, headers, and bodies. Switch environments instantly.

  - title: OAuth 2.0
    details: Supports authorization code (with PKCE), client credentials, implicit, and password grant flows. Client secrets stay server-side.

  - title: Console Logging
    details: Every request and response is logged in the console panel with status codes, timing, and full payloads.

  - title: Dark Mode
    details: Dark-mode-first UI with a light mode toggle. Built with React and TailwindCSS.
---

## Quick Start

### Desktop App

Download for Windows, macOS, or Linux from the [releases page](https://github.com/t3rr11/Requesto/releases).

### Docker

```bash
docker run -d \
  -p 4000:4000 \
  -v requesto-data:/app/data \
  ghcr.io/t3rr11/requesto:latest
```

### From Source

```bash
git clone https://github.com/t3rr11/Requesto.git
cd Requesto
npm install
npm run dev
```
