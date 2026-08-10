# Build stage
FROM node:22-alpine AS builder
WORKDIR /build
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Runtime stage - lean image with only production deps
FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY --from=builder /build/dist ./dist
RUN chmod +x ./dist/index.js && npm link

# Tests run against a mounted workspace directory
WORKDIR /workspace
ENTRYPOINT ["requesto"]
CMD ["test"]
