---
title: Desktop App
description: Download the Requesto desktop app for Windows, macOS, or Linux. An Electron wrapper that bundles the backend locally - no browser or separate server required.
---

# Desktop App

The desktop app is an Electron wrapper around the same web UI. It bundles the backend as a Node.js child process so everything runs locally - no browser or separate server needed.

::: warning Unsigned Binaries
The desktop installers are **not code-signed**. Windows SmartScreen and macOS Gatekeeper will show warnings when you run them.

Code signing requires purchasing a certificate from a trusted Certificate Authority, which is a cost this project doesn't have the backing for. The binaries are built directly from the public source code, but without a signature your OS has no way to verify that.

If you'd rather not trust a pre-built binary:
- **Review the source** — the full codebase is on [GitHub](https://github.com/t3rr11/Requesto)
- **Run with Docker** — no executable to trust, just `docker run` ([instructions](/deployment/docker))
- **Run in dev mode** — clone the repo, `npm install`, `npm run dev`
- **Build your own binary** — follow the [Building from Source](/deployment/building) guide to package the `.exe` yourself from code you can audit
:::

## Installation

Download the installer for your platform from the [GitHub releases page](https://github.com/t3rr11/Requesto/releases).

### Windows

Run the `.exe` installer, or use the portable version (no install needed).

Windows SmartScreen may warn about an unrecognized app since the binary isn't code-signed. Click "More info" → "Run anyway".

**Data location**: `%APPDATA%\requesto-electron\data`

### macOS

Open the `.dmg` and drag Requesto to Applications. On first launch, right-click → Open to bypass Gatekeeper.

**Data location**: `~/Library/Application Support/requesto-electron/data`

### Linux

**AppImage**:
```bash
chmod +x Requesto-*.AppImage
./Requesto-*.AppImage
```

**Debian/Ubuntu**: `sudo dpkg -i Requesto-*.deb`

**Fedora/RHEL**: `sudo rpm -i Requesto-*.rpm`

**Data location**: `~/.config/requesto-electron/data`

## Updates

Requesto checks for a new version automatically when it launches. If one is available, a download icon with a green dot appears in the top-right of the header.

Click the icon to open the update dialog, which shows the new version number and any release notes. From there:

1. Click **Download Update** — the installer downloads in the background and a progress bar is shown.
2. Once complete, click **Restart & Install** — the app closes, installs silently, and relaunches.

On Windows the installer runs in-place using NSIS, so your taskbar and Start Menu shortcuts are preserved across updates. You can also dismiss the dialog and install later — the badge stays visible until you restart.

## How It Works

When you launch the desktop app:

1. The Electron process starts the Fastify backend on port 4000 as a child process
2. The frontend loads from bundled static files
3. All API requests go through the local backend, same as the web version
4. Data is stored in JSON files in the platform-specific app data directory

## Data Files

```
data/
├── workspaces.json           # Workspace registry and active workspace
├── Default/                  # Default workspace
│   ├── collections.json      # Collections, folders, and saved requests
│   ├── environments.json     # Environments and variables
│   ├── oauth-configs.json    # OAuth configurations (no client secrets)
│   └── .requesto/            # Local-only data
│       ├── history.json
│       └── oauth-secrets.json
└── workspaces/               # Additional workspaces (including git clones)
```

To back up, copy the `data` folder. To restore, copy it back and restart the app.

## Building from Source

```bash
git clone https://github.com/t3rr11/Requesto.git
cd Requesto
npm install
npm run build
npm run package:electron:win   # or :mac or :linux
```

Output goes to `apps/electron/dist/`.

## Troubleshooting

**Port 4000 conflict** - The backend uses port 4000 internally. If something else is using it, close that process and restart Requesto.

**macOS Gatekeeper** - Right-click the app → "Open" to bypass on first launch.

**Linux AppImage needs FUSE** - Install it with `sudo apt install fuse` (Ubuntu/Debian) or `sudo dnf install fuse` (Fedora).

## Uninstalling

- **Windows**: Use "Add or Remove Programs"
- **macOS**: Delete from Applications. Optionally remove data: `rm -rf ~/Library/Application\ Support/requesto-electron`
- **Linux**: `sudo apt remove requesto` or `sudo rpm -e requesto` or just delete the AppImage. Optionally remove data: `rm -rf ~/.config/requesto-electron`
