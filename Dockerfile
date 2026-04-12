# Multi-stage build for backend
FROM node:24-alpine AS backend-build

WORKDIR /app/backend

COPY apps/backend/package*.json ./
RUN npm install

COPY apps/backend/ ./
RUN npm run build

# Multi-stage build for frontend
FROM node:24-alpine AS frontend-build

WORKDIR /app/frontend

COPY apps/frontend/package*.json ./
RUN npm install

COPY apps/frontend/ ./
RUN npm run build

# Production image
FROM node:24-alpine

WORKDIR /app

# Copy backend production dependencies and build
COPY apps/backend/package*.json ./
RUN npm install --omit=dev

COPY --from=backend-build /app/backend/dist ./dist

# Copy frontend build
COPY --from=frontend-build /app/frontend/dist ./public

# Create data directory for JSON storage
RUN mkdir -p /app/data

# Expose port
EXPOSE 4000

# Environment variables
ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

# Start the application
CMD ["node", "dist/server.js"]
