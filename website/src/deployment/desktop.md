# Desktop App

The desktop app is an Electron wrapper around the same web UI. It bundles the backend as a Node.js child process so everything runs locally - no browser or separate server needed.

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

## How It Works

When you launch the desktop app:

1. The Electron process starts the Fastify backend on port 4000 as a child process
2. The frontend loads from bundled static files
3. All API requests are proxied through the local backend, same as the web version
4. Data is stored in JSON files in the platform-specific app data directory

## Data Files

```
data/
├── collections.json      # Collections, folders, and saved requests
├── environments.json     # Environments and variables
├── history.json          # Request/response history
└── oauth-configs.json    # OAuth configurations (includes client secrets)
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
