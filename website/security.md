# Security Compliance

Security guidelines for deploying Requesto in corporate environments.

## Security Overview

Requesto is designed with security and privacy as core principles:

- **Self-hosted** - Your data never leaves your infrastructure
- **Local storage** - All data stored in JSON files, no external databases
- **No telemetry** - Zero tracking or analytics
- **Open source** - MIT licensed, auditable code

## Already Implemented Security Features

### Electron Security

- **Context Isolation**: Enabled - prevents renderer process from accessing Node.js APIs

- **Node Integration Disabled**: Web content cannot directly access Node.js

- **Web Security Enabled**: Prevents cross-origin vulnerabilities

- **Secure Preload Script**: Uses contextBridge API for controlled IPC

- **External Link Handling**: Opens external URLs in default browser, not in-app

### Data Security

- **Atomic Writes**: Uses temp file + rename pattern to prevent data corruption

- **Local Storage Only**: No cloud sync, no external API calls for data storage

- **OAuth Secrets Server-Side**: Client secrets stored server-side only, never exposed to frontend

## Corporate Deployment Checklist

### Required for Corporate Approval

#### 1. Code Signing (Recommended)

Without code signing, Windows SmartScreen flags the app as "unrecognized".

**Options**:

**Extended Validation (EV) Certificate** (~$400-600/year) - **RECOMMENDED**
- Immediate SmartScreen reputation (no warnings)
- More rigorous company validation required
- Comes on USB hardware token
- Best for corporate environments

**Standard Code Signing Certificate** (~$200-400/year)
- Purchase from DigiCert, Sectigo, SSL.com
- Builds reputation over time as users download
- 3-5 day validation process

**Implementation**:
```powershell
# Set environment variables
$env:CSC_LINK = "path\to\certificate.pfx"
$env:CSC_KEY_PASSWORD = "certificate-password"

# Build signed app
npm run package:electron:win
```

#### 2. Content Security Policy (CSP)

Add to `apps/frontend/index.html`:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https:; 
               connect-src 'self' http://localhost:* https:;">
```

#### 3. Security Audit Documentation

Provide to your security team:

- [ ] Dependency audit: `npm audit`
- [ ] List of third-party packages
- [ ] Data storage locations
- [ ] Network communication endpoints
- [ ] Permission requirements

Run audit:
```bash
npm audit
npm audit fix  # Auto-fix vulnerabilities
```

#### 4. Network Security

**Firewall Rules**:
- Desktop app: No inbound connections required
- Docker deployment: Only port 3000 (or configured port)

**Outbound Connections**:
- Only to user-specified API endpoints
- No telemetry or update servers (by default)

## Data Protection

### Storage Locations

**Desktop App**:
- Windows: `%APPDATA%\requesto-electron\data`
- macOS: `~/Library/Application Support/requesto-electron/data`
- Linux: `~/.config/requesto-electron/data`

**Docker**:
- `/app/data` (mount to host for persistence)

### Data Files

```
data/
├── collections.json      # API collections and saved requests
├── environments.json     # Environment variables and secrets
├── history.json          # Request/response history
└── oauth-configs.json    # OAuth configurations (includes client secrets)
```

### Sensitive Data Handling

**Environment Variables**: Stored encrypted at rest (recommended to enable)

**OAuth Secrets**: 
- Client secrets: Stored server-side only (`oauth-configs.json`)
- Access tokens: Stored client-side (sessionStorage or localStorage based on user preference)
- Refresh tokens: Auto-refresh when enabled

**API Keys**: Stored in plaintext in environment variables or request auth headers
- Recommendation: Use OS-level encryption for data directory

### Backup Strategy

```bash
# Automated daily backups
0 2 * * * docker exec requesto tar -czf /tmp/backup.tar.gz /app/data && \
          docker cp requesto:/tmp/backup.tar.gz /backups/requesto-$(date +\%Y\%m\%d).tar.gz
```

## Authentication & Authorization

### For the Application

Requesto itself has **no built-in authentication**. For corporate environments:

**Recommended Approaches**:

1. **Network-level Security**: Deploy behind VPN or on internal network
2. **Reverse Proxy Auth**: Use nginx with BasicAuth or SSO integration
3. **Desktop App**: Physical access control (user accounts on machines)

**Example nginx with BasicAuth**:

```nginx
server {
    listen 80;
    server_name requesto.internal.corp.com;
    
    auth_basic "Requesto Access";
    auth_basic_user_file /etc/nginx/.htpasswd;
    
    location / {
        proxy_pass http://localhost:3000;
    }
}
```

### For External APIs

Requesto supports:
- Basic Authentication
- Bearer Tokens
- API Keys (header/query param)
- OAuth 2.0 (all grant types including PKCE)

## Docker Security Hardening

### 1. Run as Non-Root User

Already implemented in `Dockerfile`:
```dockerfile
USER node
```

### 2. Resource Limits

```yaml
services:
  requesto:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

### 3. Read-Only Filesystem

```yaml
services:
  requesto:
    read_only: true
    tmpfs:
      - /tmp
      - /app/data  # Only data directory writable
```

### 4. Network Isolation

```yaml
networks:
  internal:
    driver: bridge
    internal: true  # No external access
```

### 5. Security Scanning

```bash
# Scan Docker image
docker scan ghcr.io/YOUR_USERNAME/requesto:latest

# Or use Trivy
trivy image ghcr.io/YOUR_USERNAME/requesto:latest
```

## Compliance Certifications

### GDPR Compliance

- **Data Minimization**: Only collects data user explicitly enters

- **Data Portability**: Export collections as JSON

- **Right to Erasure**: Users control all data, can delete anytime

- **No Third-Party Sharing**: No data leaves user's infrastructure

### SOC 2 / ISO 27001

For organizations requiring these certifications:

- Access controls via network/proxy-level auth
- Audit logging of all requests (history.json)
- Data encryption at rest (OS-level or volume encryption)
- Secure software development lifecycle (SSDLC)

## Vulnerability Disclosure

Report security vulnerabilities to: security@example.com

See [SECURITY.md](https://github.com/t3rr11/Requesto/blob/main/SECURITY.md) for our security policy.

## Security Best Practices

### For Administrators

1. **Keep Updated**: Monitor releases for security patches
2. **Secure Data Directory**: Use encrypted volumes for sensitive data
3. **Network Segmentation**: Deploy on internal networks when possible
4. **Regular Backups**: Implement automated backup strategy
5. **Access Control**: Use reverse proxy with authentication
6. **Audit Logs**: Regularly review request history for anomalies

### For Users

1. **Strong Environment Variables**: Use secure password generation for API keys
2. **OAuth Over API Keys**: Prefer OAuth 2.0 when supported by APIs
3. **Separate Environments**: Use different environments for dev/staging/prod
4. **Export Regularly**: Backup collections to version control
5. **Review Permissions**: Check OAuth scopes before authorizing

## Incident Response

If a security incident occurs:

1. **Isolate**: Stop the container/app immediately
2. **Assess**: Check logs for unauthorized access
3. **Backup**: Preserve data for forensics
4. **Patch**: Update to latest version
5. **Rotate**: Change all API keys/credentials
6. **Report**: Contact security team

## Third-Party Dependencies

Requesto uses vetted, widely-adopted libraries:

**Frontend**:
- React (Meta)
- TailwindCSS (Tailwind Labs)
- Zustand (Poimandres)

**Backend**:
- Fastify (OpenJS Foundation)
- Node.js (OpenJS Foundation)

**Desktop**:
- Electron (OpenJS Foundation)

All dependencies are regularly audited with `npm audit`.

## Penetration Testing

For organizations requiring penetration testing:

1. Deploy in isolated test environment
2. Provide test credentials
3. Monitor logs during testing
4. Report findings to security@example.com

## Security Roadmap

Future security enhancements:

- [ ] Built-in encryption for data files
- [ ] Optional password protection for desktop app
- [ ] Two-factor authentication for OAuth flows
- [ ] Certificate pinning for API requests
- [ ] Automatic security updates
