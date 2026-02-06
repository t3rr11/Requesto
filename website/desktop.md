# Desktop Application

Run Requesto natively on Windows, macOS, or Linux.

## Installation

Download the appropriate installer from the [Download page](/download) and follow the platform-specific instructions below.

### Windows

1. Download `Requesto-Setup-1.0.0.exe` (installer) or `Requesto-1.0.0-portable.exe` (portable)
2. Run the installer
   - For portable version, just extract and run
3. Windows Defender SmartScreen may show a warning (until we build reputation)
   - Click "More info" → "Run anyway"
4. Launch from Start Menu or Desktop shortcut

**Installation Location**: `C:\Users\<username>\AppData\Local\Requesto`

**Data Location**: `C:\Users\<username>\AppData\Roaming\requesto-electron\data`

### macOS

1. Download `Requesto-1.0.0.dmg`
2. Open the DMG file
3. Drag Requesto to Applications folder
4. Launch from Applications
   - On first launch, right-click → Open to bypass Gatekeeper

**Installation Location**: `/Applications/Requesto.app`

**Data Location**: `~/Library/Application Support/requesto-electron/data`

### Linux

#### AppImage (Universal)

```bash
chmod +x Requesto-1.0.0.AppImage
./Requesto-1.0.0.AppImage
```

#### Debian/Ubuntu (.deb)

```bash
sudo dpkg -i Requesto-1.0.0.deb
sudo apt-get install -f  # Install dependencies if needed
```

#### Fedora/RHEL (.rpm)

```bash
sudo rpm -i Requesto-1.0.0.rpm
```

**Data Location**: `~/.config/requesto-electron/data`

## Features

The desktop app includes:

- Full offline functionality
- Native OS integration
- Auto-updates (when configured)
- System tray support
- Native notifications
- No browser required

## Data Storage

All your data is stored locally:

```
data/
├── collections.json      # Your saved collections
├── environments.json     # Environment variables
├── history.json          # Request history
└── oauth-configs.json    # OAuth configurations
```

### Backing Up Your Data

**Windows**:
```powershell
Copy-Item "$env:APPDATA\requesto-electron\data" -Destination ".\backup" -Recurse
```

**macOS/Linux**:
```bash
cp -r ~/Library/Application\ Support/requesto-electron/data ./backup
```

### Restoring Data

Simply copy your backed-up `data` folder back to the original location.

## Building from Source

Want to customize or build from source?

```bash
# Clone repository
git clone https://github.com/t3rr11/Requesto.git
cd Requesto

# Install dependencies
npm install

# Build for your platform
npm run build
npm run package:electron:win   # Windows
npm run package:electron:mac   # macOS
npm run package:electron:linux # Linux
```

Built apps will be in `apps/electron/dist/`

## Troubleshooting

### Windows SmartScreen Warning

This appears because the app isn't code-signed yet. Click "More info" → "Run anyway". Once we obtain an Extended Validation certificate, this warning will disappear.

### macOS Gatekeeper Block

Right-click the app → "Open" → "Open" to bypass Gatekeeper on first launch.

### Linux AppImage Won't Run

```bash
# Install FUSE
sudo apt install fuse  # Ubuntu/Debian
sudo dnf install fuse  # Fedora

# Make executable
chmod +x Requesto-1.0.0.AppImage
```

### App Won't Start

Check logs:

**Windows**: `%APPDATA%\requesto-electron\logs\main.log`

**macOS**: `~/Library/Logs/requesto-electron/main.log`

**Linux**: `~/.config/requesto-electron/logs/main.log`

### Port Conflict

If the internal backend port (4000) is in use:

1. Close Requesto
2. Find and kill the process using port 4000
3. Restart Requesto

## Uninstalling

### Windows

Use "Add or Remove Programs" or run the uninstaller from the installation directory.

### macOS

Delete the app from Applications folder and optionally remove data:
```bash
rm -rf ~/Library/Application\ Support/requesto-electron
```

### Linux

```bash
# Debian/Ubuntu
sudo apt remove requesto

# Fedora/RHEL
sudo rpm -e requesto

# AppImage
# Just delete the file

# Remove data (optional)
rm -rf ~/.config/requesto-electron
```

## Auto-Updates

Auto-updates are planned for future releases. Currently, download new versions manually from the [releases page](https://github.com/t3rr11/Requesto/releases).

## System Requirements

### Windows
- Windows 10 or later (64-bit)
- 4 GB RAM minimum

### macOS
- macOS 10.13 High Sierra or later
- Intel or Apple Silicon

### Linux
- Ubuntu 18.04+ / Fedora 32+ or equivalent
- 4 GB RAM minimum
