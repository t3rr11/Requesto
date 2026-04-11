# Docker Deployment

Deploy Requesto using Docker for self-hosted team installations.

## Quick Start

```bash
docker run -d \
  --name requesto \
  -p 3000:3000 \
  -v requesto-data:/app/data \
  ghcr.io/t3rr11/requesto:latest
```

Access at [http://localhost:3000](http://localhost:3000)

## Production Deployment

### Using Docker Compose (Recommended)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  requesto:
    image: ghcr.io/t3rr11/requesto:latest
    container_name: requesto
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOST=0.0.0.0
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

Start the service:

```bash
docker-compose up -d
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Runtime environment |
| `PORT` | `3000` | Port the server listens on |
| `HOST` | `0.0.0.0` | Host address to bind to |
| `DATA_DIR` | `/app/data` | Directory for data storage |

## Reverse Proxy Setup

### Nginx

```nginx
server {
    listen 80;
    server_name requesto.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for long-running requests
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
    }
}
```

### Traefik

```yaml
version: '3.8'

services:
  requesto:
    image: ghcr.io/t3rr11/requesto:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.requesto.rule=Host(`requesto.example.com`)"
      - "traefik.http.routers.requesto.entrypoints=websecure"
      - "traefik.http.routers.requesto.tls.certresolver=letsencrypt"
      - "traefik.http.services.requesto.loadbalancer.server.port=3000"
    volumes:
      - ./data:/app/data
```

## Data Persistence

### Volume Mounting

Mount the data directory to persist collections, environments, and history:

```bash
docker run -d \
  -v /path/on/host:/app/data \
  ghcr.io/t3rr11/requesto:latest
```

### Data Directory Structure

```
data/
├── collections.json      # Saved collections and requests
├── environments.json     # Environment variables
├── history.json          # Request history
└── oauth-configs.json    # OAuth configurations
```

## Backup and Restore

### Backup

```bash
# Create backup
docker exec requesto tar -czf /tmp/backup.tar.gz /app/data
docker cp requesto:/tmp/backup.tar.gz ./requesto-backup-$(date +%Y%m%d).tar.gz
```

### Restore

```bash
# Restore from backup
docker cp ./requesto-backup-20260206.tar.gz requesto:/tmp/backup.tar.gz
docker exec requesto tar -xzf /tmp/backup.tar.gz -C /
docker restart requesto
```

### Automated Backups

Add a cron job:

```bash
0 2 * * * docker exec requesto tar -czf /tmp/backup.tar.gz /app/data && \
          docker cp requesto:/tmp/backup.tar.gz /backups/requesto-$(date +\%Y\%m\%d).tar.gz
```

## Building from Source

Clone and build your own image:

```bash
git clone https://github.com/t3rr11/Requesto.git
cd Requesto

# Build
docker build -t requesto:custom .

# Run
docker run -d -p 3000:3000 -v requesto-data:/app/data requesto:custom
```

## Health Checks

The application exposes a health endpoint:

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-06T10:30:00.000Z"
}
```

## Resource Requirements

### Minimum
- **CPU**: 0.5 cores
- **RAM**: 512 MB
- **Disk**: 100 MB + data

### Recommended
- **CPU**: 1 core
- **RAM**: 1 GB
- **Disk**: 1 GB

## Troubleshooting

### Container won't start

Check logs:
```bash
docker logs requesto
```

### Permission issues

Ensure the data directory is writable:
```bash
chmod -R 777 ./data
```

### Port already in use

Change the port mapping:
```bash
docker run -d -p 8080:3000 ...
```

## Security Hardening

### Run as non-root user

The Docker image already runs as a non-root user by default.

### Limit resources

```yaml
services:
  requesto:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Network isolation

```yaml
services:
  requesto:
    networks:
      - internal
    
networks:
  internal:
    driver: bridge
```

## Updates

Pull the latest image:

```bash
docker-compose pull
docker-compose up -d
```

Or with plain Docker:

```bash
docker pull ghcr.io/t3rr11/requesto:latest
docker stop requesto
docker rm requesto
docker run -d --name requesto -p 3000:3000 -v requesto-data:/app/data ghcr.io/t3rr11/requesto:latest
```
