# Production Deployment Guide

This guide covers deploying Requesto in various production scenarios.

## Table of Contents

1. [Desktop Application](#desktop-application)
2. [Docker Deployment](#docker-deployment)
3. [Self-Hosted Web Server](#self-hosted-web-server)
4. [Reverse Proxy Setup](#reverse-proxy-setup)
5. [Security Hardening](#security-hardening)
6. [Backup and Restore](#backup-and-restore)

## Desktop Application

### Building from Source

```bash
# Clone and install
git clone https://github.com/t3rr11/Requesto.git
cd requesto
npm install

# Build for your platform
npm run package:electron:win   # Windows
npm run package:electron:mac   # macOS
npm run package:electron:linux # Linux
```

### Distribution

The built applications will be in the `dist/` directory:

- **Windows**: `.exe` installer and portable `.exe`
- **macOS**: `.dmg` installer and `.zip`
- **Linux**: `.AppImage` and `.deb`

### Installation Locations

- **Windows**: `C:\Users\<username>\AppData\Local\Requesto`
- **macOS**: `/Applications/Requesto.app`
- **Linux**: `/opt/Requesto` or `~/.local/share/Requesto`

### Data Storage

User data is stored in:

- **Windows**: `C:\Users\<username>\AppData\Roaming\requesto-electron\data`
- **macOS**: `~/Library/Application Support/requesto-electron/data`
- **Linux**: `~/.config/requesto-electron/data`

## Docker Deployment

### Basic Deployment

```bash
# Using Docker Compose (recommended)
docker-compose up -d

# Using Docker directly
docker build -t Requesto .
docker run -d -p 4000:4000 -v requesto-data:/app/apps/backend/data Requesto
```

### Production Docker Compose

```yaml
version: '3.8'

services:
  Requesto:
    build: .
    container_name: Requesto
    restart: unless-stopped
    ports:
      - "4000:4000"
    volumes:
      - ./data:/app/apps/backend/data
    environment:
      - NODE_ENV=production
      - PORT=4000
      - HOST=0.0.0.0
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Environment Variables

```bash
# .env file
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
DATA_DIR=/app/data
```

## Self-Hosted Web Server

### Prerequisites

- Node.js 20+
- PM2 or systemd for process management
- Nginx or Apache for reverse proxy

### Setup with PM2

```bash
# Install PM2
npm install -g pm2

# Build the application
npm run build

# Start backend
cd apps/backend
pm2 start dist/server.js --name requesto-backend

# Serve frontend (using nginx or serve)
npm install -g serve
cd ../frontend
pm2 start "serve -s dist -l 5173" --name requesto-frontend

# Save PM2 configuration
pm2 save
pm2 startup
```

### Systemd Service (Linux)

Create `/etc/systemd/system/requesto-backend.service`:

```ini
[Unit]
Description=Requesto Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/Requesto/apps/backend
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=4000
Environment=DATA_DIR=/var/lib/Requesto/data

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable requesto-backend
sudo systemctl start requesto-backend
sudo systemctl status requesto-backend
```

## Reverse Proxy Setup

### Nginx

```nginx
server {
    listen 80;
    server_name Requesto.example.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name Requesto.example.com;

    ssl_certificate /etc/ssl/certs/Requesto.crt;
    ssl_certificate_key /etc/ssl/private/Requesto.key;

    # Frontend
    location / {
        root /opt/Requesto/apps/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:4000/health;
    }
}
```

### Apache

```apache
<VirtualHost *:80>
    ServerName Requesto.example.com
    Redirect permanent / https://Requesto.example.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName Requesto.example.com

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/Requesto.crt
    SSLCertificateKeyFile /etc/ssl/private/Requesto.key

    DocumentRoot /opt/Requesto/apps/frontend/dist

    <Directory /opt/Requesto/apps/frontend/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    ProxyPreserveHost On
    ProxyPass /api http://localhost:4000/api
    ProxyPassReverse /api http://localhost:4000/api
    ProxyPass /health http://localhost:4000/health
    ProxyPassReverse /health http://localhost:4000/health
</VirtualHost>
```

## Security Hardening

### 1. Firewall Configuration

```bash
# Ubuntu/Debian
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 2. SSL/TLS Setup

```bash
# Using Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d Requesto.example.com
```

### 3. File Permissions

```bash
# Set proper ownership
sudo chown -R www-data:www-data /opt/Requesto
sudo chmod -R 755 /opt/Requesto

# Protect data directory
sudo chmod 700 /var/lib/Requesto/data
```

### 4. Environment Variables

Never commit `.env` files. Use environment-specific configuration:

```bash
# Production .env
NODE_ENV=production
PORT=4000
DATA_DIR=/var/lib/Requesto/data
```

### 5. Rate Limiting

Add to nginx configuration:

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location /api {
    limit_req zone=api_limit burst=20 nodelay;
    # ... rest of configuration
}
```

## Backup and Restore

### Backup Script

```bash
#!/bin/bash
# backup-Requesto.sh

BACKUP_DIR="/backup/Requesto"
DATA_DIR="/var/lib/Requesto/data"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup data files
tar -czf "$BACKUP_DIR/requesto-data-$DATE.tar.gz" -C "$DATA_DIR" .

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "requesto-data-*.tar.gz" -mtime +7 -delete

echo "Backup completed: requesto-data-$DATE.tar.gz"
```

### Automated Backups

Add to crontab:

```bash
# Daily backup at 2 AM
0 2 * * * /opt/Requesto/backup-Requesto.sh
```

### Restore

```bash
#!/bin/bash
# restore-Requesto.sh

BACKUP_FILE=$1
DATA_DIR="/var/lib/Requesto/data"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file>"
    exit 1
fi

# Stop service
sudo systemctl stop requesto-backend

# Restore data
tar -xzf "$BACKUP_FILE" -C "$DATA_DIR"

# Start service
sudo systemctl start requesto-backend

echo "Restore completed from: $BACKUP_FILE"
```

## Monitoring

### Health Checks

```bash
# Simple health check
curl http://localhost:4000/health

# Detailed monitoring with PM2
pm2 monit
pm2 logs requesto-backend
```

### Log Rotation

Create `/etc/logrotate.d/Requesto`:

```
/var/log/Requesto/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload requesto-backend > /dev/null
    endscript
}
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   sudo lsof -i :4000
   sudo kill -9 <PID>
   ```

2. **Permission Denied**
   ```bash
   sudo chown -R $USER:$USER /path/to/data
   ```

3. **CORS Errors**
   - Check backend CORS configuration
   - Verify proxy settings in frontend

4. **Database Connection**
   - Ensure DATA_DIR is writable
   - Check file permissions

## Performance Tuning

### Node.js

```bash
# Increase memory limit
NODE_OPTIONS="--max-old-space-size=4096" node dist/server.js
```

### Nginx Caching

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m;

location /api {
    proxy_cache api_cache;
    proxy_cache_valid 200 1m;
    # ... rest of configuration
}
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/t3rr11/Requesto/issues
- Documentation: https://github.com/t3rr11/Requesto/wiki



