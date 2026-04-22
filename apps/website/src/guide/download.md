---
title: Download & Install
description: Install Requesto via Docker, download the desktop app for Windows, macOS, or Linux, or build it yourself from source. All install methods covered here.
---

# Download & Install

## Docker

```bash
docker run -d \
  --name requesto \
  -p 4747:4747 \
  -v requesto-data:/app/data \
  terrii/requesto:latest
```

Open [http://localhost:4747](http://localhost:4747). See the [Docker Deployment](/deployment/docker) page for compose files and configuration.

## Desktop App

Download the latest release for your platform from GitHub:

**[View Releases on GitHub →](https://github.com/t3rr11/Requesto/releases)**

Available formats:

- **Windows**: `.exe` installer or portable `.exe`
- **macOS**: `.dmg`
- **Linux**: `.AppImage`, `.deb`, `.rpm`

See the [Desktop App](/deployment/desktop) page for platform-specific setup instructions.

::: warning Unsigned Binaries
The desktop installers are **not code-signed**. Windows SmartScreen and macOS Gatekeeper will show warnings when you run them.

Code signing requires purchasing a certificate from a trusted Certificate Authority, which is a cost this project doesn't have the backing for. The binaries are built directly from the public source code, but without a signature your OS has no way to verify that.

If you'd rather not trust a pre-built binary:

- **Review the source** — the full codebase is on [GitHub](https://github.com/t3rr11/Requesto)
- **Run with Docker** — no executable to trust, just `docker run` ([instructions](/deployment/docker))
- **Run in dev mode** — clone the repo, `npm install`, `npm run dev`
- **Build your own binary** — follow the [Building from Source](/deployment/building) guide to package the `.exe` yourself from code you can audit
  :::

## From Source

```bash
git clone https://github.com/t3rr11/Requesto.git
cd Requesto
npm install
npm run dev
```

This starts the backend on port 4747 and the frontend dev server on port 5173. See [Building from Source](/deployment/building) for more details.

## Next Steps

- [Getting Started](/guide/getting-started)
- [Report an Issue](https://github.com/t3rr11/Requesto/issues)
