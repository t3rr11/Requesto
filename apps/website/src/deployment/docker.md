# Docker Deployment

## Quick Start

```bash
docker run -d \
  --name requesto \
  -p 4000:4000 \
  -v requesto-data:/app/data \
  terrii/requesto:latest
```

Open [http://localhost:4000](http://localhost:4000).

## Docker Compose

```yaml
services:
  requesto:
    image: terrii/requesto:latest
    container_name: requesto
    restart: unless-stopped
    ports:
      - "4000:4000"
    volumes:
      - requesto-data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=4000
      - HOST=0.0.0.0

volumes:
  requesto-data:
```

```bash
docker-compose up -d
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Set to `production` to serve the frontend as static files |
| `PORT` | `4000` | Port the server listens on |
| `HOST` | `0.0.0.0` | Address to bind to |
| `DATA_DIR` | `/app/data` | Directory for JSON data files |

## Data Persistence

Mount a volume or bind-mount at `/app/data`. This directory holds all your data, organized by workspace:

```
data/
├── workspaces.json           # Workspace registry and active workspace
├── Default/                  # Default workspace
│   ├── collections.json      # Collections, folders, and saved requests
│   ├── environments.json     # Environments and variables
│   ├── oauth-configs.json    # OAuth configurations (no client secrets)
│   └── .requesto/            # Local-only data
│       ├── history.json      # Request/response history (last 100)
│       └── oauth-secrets.json
└── workspaces/               # Additional workspaces (including git clones)
```

These are plain JSON files. You can back them up by copying the entire data directory:

```bash
docker cp requesto:/app/data ./backup
```

To restore, copy the directory back and restart:

```bash
docker cp ./backup/. requesto:/app/data
docker restart requesto
```

## Building from Source

```bash
git clone https://github.com/t3rr11/Requesto.git
cd Requesto
docker build -t requesto:custom .
docker run -d -p 4000:4000 -v requesto-data:/app/data requesto:custom
```

The Dockerfile uses a multi-stage build: backend and frontend are built in separate stages, then combined into a Node.js Alpine production image.

## Health Check

```bash
curl http://localhost:4000/api/health
```

```json
{"status": "ok"}
```

## Reverse Proxy

If you're putting Requesto behind nginx or similar:

```nginx
server {
    listen 80;
    server_name requesto.example.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Increase timeouts for long-running API requests
        proxy_read_timeout 600;
    }
}
```

## Updating

```bash
docker-compose pull
docker-compose up -d
```

Or without Compose:

```bash
docker pull terrii/requesto:latest
docker stop requesto && docker rm requesto
docker run -d --name requesto -p 4000:4000 -v requesto-data:/app/data terrii/requesto:latest
```

## Troubleshooting

**Container won't start** - Check logs with `docker logs requesto`.

**Port conflict** - Change the host-side port: `-p 8080:4000`.

**Permission issues on data directory** - Make sure the mount path is writable.
