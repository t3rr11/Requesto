# Building from Source

Developer guide for building Requesto from source code.

## Prerequisites

- **Node.js**: 18 or higher
- **npm**: 9 or higher (comes with Node.js)
- **Git**: For cloning the repository

### Platform-Specific Requirements

#### Windows
- Visual Studio Build Tools (for native modules)
- Powershell execution policy set to allow scripts

#### macOS
- Xcode Command Line Tools: `xcode-select --install`

#### Linux
- Build essentials: `sudo apt install build-essential`

## Clone Repository

```bash
git clone https://github.com/t3rr11/Requesto.git
cd Requesto
```

## Project Structure

Requesto is a monorepo with three apps:

```
Requesto/
├── apps/
│   ├── backend/      # Fastify Node.js proxy server
│   ├── frontend/     # React/Vite web interface
│   └── electron/     # Electron desktop wrapper
├── website/          # VitePress documentation
└── package.json      # Root workspace config
```

## Development Setup

### Install Dependencies

```bash
npm install
```

This installs dependencies for all three apps.

### Development Mode

#### Web Application (Frontend + Backend)

```bash
npm run dev
```

This starts:
- Backend server on `http://localhost:4000`
- Frontend dev server on `http://localhost:5173`

#### Desktop Application

```bash
npm run dev:electron
```

This starts all three (backend, frontend, electron window).

### Individual Apps

```bash
npm run dev:backend   # Backend only
npm run dev:frontend  # Frontend only
```

## Building for Production

### Build All Apps

```bash
npm run build
```

This builds:
- Backend → `apps/backend/dist/`
- Frontend → `apps/frontend/dist/`
- Electron → `apps/electron/dist/`

### Build Individual Apps

```bash
npm run build:backend
npm run build:frontend
npm run build:electron
```

## Packaging Desktop Application

### Windows

```bash
npm run package:electron:win
```

Creates:
- `Requesto-Setup-1.0.0.exe` (NSIS installer)
- `Requesto-1.0.0-portable.exe` (Portable executable)

Output: `apps/electron/dist/`

### macOS

```bash
npm run package:electron:mac
```

Creates:
- `Requesto-1.0.0.dmg` (Disk image)
- `Requesto-1.0.0-mac.zip` (Zipped app)

### Linux

```bash
npm run package:electron:linux
```

Creates:
- `Requesto-1.0.0.AppImage` (Universal)
- `Requesto-1.0.0.deb` (Debian/Ubuntu)
- `Requesto-1.0.0.rpm` (Fedora/RHEL)

### All Platforms

```bash
npm run package:electron
```

Builds for all supported platforms (requires appropriate build environment).

## Building Docker Image

### Development

```bash
docker-compose up --build
```

### Production

```bash
docker build -t requesto:custom .
```

The Dockerfile uses multi-stage builds:
1. Build backend
2. Build frontend
3. Combine in production image

## Development Workflow

### 1. Start Development Servers

```bash
npm run dev
```

### 2. Make Changes

- Frontend: Edit files in `apps/frontend/src/`
- Backend: Edit files in `apps/backend/src/`
- Changes hot-reload automatically

### 3. Test Changes

```bash
# Frontend tests (when implemented)
npm test -w requesto-frontend

# Backend tests (when implemented)
npm test -w requesto-backend
```

### 4. Build for Production

```bash
npm run build
```

### 5. Test Production Build

```bash
# Start backend in production mode
cd apps/backend
npm start

# Or test Electron app
npm run package:electron:win
```

## Configuration

### Environment Variables

Create `.env` files in each app directory:

**apps/backend/.env**:
```env
NODE_ENV=development
PORT=4000
HOST=localhost
DATA_DIR=./data
```

**apps/frontend/.env**:
```env
VITE_API_URL=http://localhost:4000/api
```

### Electron Builder Config

Modify `apps/electron/package.json` to customize installers:

```json
{
  "build": {
    "appId": "com.requesto.app",
    "productName": "Requesto",
    "directories": {
      "output": "dist"
    },
    "win": {
      "target": ["nsis", "portable"],
      "icon": "build/icon.ico"
    }
  }
}
```

## Troubleshooting

### Node Version Issues

Ensure you're using Node.js 18+:
```bash
node --version  # Should be v18.0.0 or higher
```

Use [nvm](https://github.com/nvm-sh/nvm) to manage Node versions:
```bash
nvm install 18
nvm use 18
```

### Build Failures

Clear caches and reinstall:
```bash
rm -rf node_modules apps/*/node_modules
npm install
```

### Port Already in Use

Change ports in:
- `apps/backend/src/server.ts` (backend port)
- `apps/frontend/vite.config.ts` (dev server port)

### Native Module Errors

Rebuild native modules:
```bash
npm rebuild
```

## Code Signing (Optional)

For production releases, code signing removes security warnings.

### Windows

1. Obtain a code signing certificate (.pfx file)
2. Set environment variables:
   ```powershell
   $env:CSC_LINK = "path\to\certificate.pfx"
   $env:CSC_KEY_PASSWORD = "certificate-password"
   ```
3. Build:
   ```bash
   npm run package:electron:win
   ```

### macOS

1. Obtain Apple Developer Certificate
2. Set environment variables:
   ```bash
   export CSC_NAME="Developer ID Application: Your Name"
   ```
3. Build and notarize:
   ```bash
   npm run package:electron:mac
   ```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and test
4. Commit: `git commit -m "Add my feature"`
5. Push: `git push origin feature/my-feature`
6. Open a Pull Request

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend + frontend |
| `npm run dev:electron` | Start all three with Electron window |
| `npm run build` | Build all apps for production |
| `npm run package:electron` | Create desktop installers |
| `npm run package:electron:win` | Windows installer only |
| `docker-compose up --build` | Build and run Docker image |

## Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS, Zustand, React Router
- **Backend**: Node.js, Fastify, TypeScript
- **Desktop**: Electron, electron-builder
- **Build**: Vite, esbuild
- **Deployment**: Docker, multi-stage builds
