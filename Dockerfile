# Multi-stage build for backend
FROM node:20-alpine AS backend-build

WORKDIR /app/backend

COPY apps/backend/package*.json ./
RUN npm ci

COPY apps/backend/ ./
RUN npm run build

# Multi-stage build for frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

COPY apps/frontend/package*.json ./
RUN npm ci

COPY apps/frontend/ ./
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy backend production dependencies and build
COPY apps/backend/package*.json ./
RUN npm ci --omit=dev

COPY --from=backend-build /app/backend/dist ./dist

# Copy frontend build
COPY --from=frontend-build /app/frontend/dist ./public

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Start the application
CMD ["node", "dist/server.js"]
