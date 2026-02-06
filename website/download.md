# Download & Install

Choose the installation method that best fits your needs.

## Desktop Application (Recommended)

The easiest way to get started - download and run on your local machine.

### Windows
- **[Requesto-Setup-1.0.0.exe](https://github.com/t3rr11/Requesto/releases/download/v1.0.0/Requesto-Setup-1.0.0.exe)** (Installer)
- **[Requesto-1.0.0-portable.exe](https://github.com/t3rr11/Requesto/releases/download/v1.0.0/Requesto-1.0.0-portable.exe)** (Portable)

### macOS
- **[Requesto-1.0.0.dmg](https://github.com/t3rr11/Requesto/releases/download/v1.0.0/Requesto-1.0.0.dmg)** (Intel & Apple Silicon)

### Linux
- **[Requesto-1.0.0.AppImage](https://github.com/t3rr11/Requesto/releases/download/v1.0.0/Requesto-1.0.0.AppImage)** (AppImage)
- **[Requesto-1.0.0.deb](https://github.com/t3rr11/Requesto/releases/download/v1.0.0/Requesto-1.0.0.deb)** (Debian/Ubuntu)
- **[Requesto-1.0.0.rpm](https://github.com/t3rr11/Requesto/releases/download/v1.0.0/Requesto-1.0.0.rpm)** (Fedora/RHEL)

### Installation Steps

1. **Download** the installer for your platform above
2. **Install** by running the downloaded file
   - Windows: Run the `.exe` installer
   - macOS: Open the `.dmg` and drag to Applications
   - Linux: Run `chmod +x Requesto-1.0.0.AppImage && ./Requesto-1.0.0.AppImage` or install `.deb`/`.rpm` with your package manager
3. **Launch** Requesto from your applications menu

---

## Docker (Self-Hosted)

Perfect for teams or self-hosted environments.

### Docker Hub / GitHub Container Registry

Pull and run the latest image:

```bash
docker run -d \
  --name requesto \
  -p 3000:3000 \
  -v requesto-data:/app/data \
  ghcr.io/t3rr11/requesto:latest
```

Access at [http://localhost:3000](http://localhost:3000)

### Using Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  requesto:
    image: ghcr.io/t3rr11/requesto:latest
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

Run with:
```bash
docker-compose up -d
```

---

## Build from Source (Advanced)

For developers who want full control and customization.

### Prerequisites
- Node.js 18+ and npm
- Git

### Clone and Build

```bash
# Clone the repository
git clone https://github.com/t3rr11/Requesto.git
cd Requesto

# Install dependencies
npm install

# Development mode (hot reload)
npm run dev
# Access at http://localhost:5173

# Build for production
npm run build

# Package desktop app
npm run package:electron:win  # Windows
npm run package:electron      # All platforms
```

### Development with Docker

```bash
# Build and run locally
docker-compose up --build
```

---

## System Requirements

### Desktop App
- **Windows:** Windows 10 or later (64-bit)
- **macOS:** macOS 10.13 High Sierra or later
- **Linux:** Ubuntu 18.04+, Fedora 32+, or equivalent

### Docker
- Docker Engine 20.10+
- Docker Compose 1.29+ (optional)

### Source Build
- Node.js 18+
- npm or yarn
- Git

---

## What's Included?

All distributions include:
- Full-featured API client
- Collections & folder management
- Environment variables
- OAuth 2.0 support
- Request history
- Dark mode
- No telemetry or analytics

---

## Version History

See the [Changelog on GitHub](https://github.com/t3rr11/Requesto/releases) for detailed release notes and version history.

---

## Verification

### Checksums

Download the `checksums.txt` file from the [releases page](https://github.com/t3rr11/Requesto/releases/latest) to verify your download:

```bash
# Windows (PowerShell)
Get-FileHash Requesto-Setup-1.0.0.exe -Algorithm SHA256

# macOS/Linux
sha256sum Requesto-1.0.0.dmg
```

Compare the output with the checksums file.

---

## Next Steps

[Get Started with Requesto](/getting-started)

## Need Help?

- [Getting Started Guide](/getting-started)
- [Report an Issue](https://github.com/t3rr11/Requesto/issues)
- [Discussions](https://github.com/t3rr11/Requesto/discussions)
