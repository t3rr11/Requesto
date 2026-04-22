# Multi-stage build for backend
FROM node:24-alpine AS backend-build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
RUN npm ci --workspace=apps/backend --include-workspace-root

COPY apps/backend/ ./apps/backend/
RUN npm run build --workspace=apps/backend

# Multi-stage build for frontend
FROM node:24-alpine AS frontend-build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/
RUN npm ci --workspace=apps/frontend --include-workspace-root

COPY apps/frontend/ ./apps/frontend/
RUN npm run build --workspace=apps/frontend

# Production image
FROM node:24-alpine

# Upgrade Alpine system packages to patch known CVEs
RUN apk update && apk upgrade --no-cache && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy backend production dependencies using workspace-aware install
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
RUN npm ci --workspace=apps/backend --include-workspace-root --omit=dev && \
    npm cache clean --force && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY --from=backend-build /app/apps/backend/dist ./dist

# Copy frontend build
COPY --from=frontend-build /app/apps/frontend/dist ./public

# Create non-root user and data directory
RUN addgroup -g 1001 requesto && adduser -D -u 1001 -G requesto requesto && \
    mkdir -p /app/data && chown -R requesto:requesto /app

# Expose port
EXPOSE 4747

# Environment variables
ENV NODE_ENV=production
ENV PORT=4747
ENV HOST=0.0.0.0

# Declare volume after chown so Docker initialises it with requesto ownership
VOLUME ["/app/data"]

# Run as non-root user
USER requesto

# Start the application
CMD ["node", "dist/server.js"]
