# Self-Hosted API Client (Postman Alternative)

## 1. Project Overview

Localman

### Working Description

A lightweight, self-hosted alternative to Postman that can be started via Docker and immediately used to test HTTP APIs through a web UI. The focus is speed, simplicity, and local control — no cloud accounts, no forced structure, no vendor lock-in.

This tool is **not** trying to compete with Postman feature-for-feature. It intentionally targets the ~20% of functionality used 80% of the time.

### Core Principles

* Docker-first (single command startup)
* Self-hosted, offline-capable
* Zero onboarding friction
* Useful immediately after launch
* Built primarily for individual developers or small teams

---

## 2. Goals & Non-Goals

### Goals

* Send HTTP requests (GET, POST, PUT, PATCH, DELETE)
* Edit headers and request bodies
* View responses clearly (status, headers, body, timing)
* Persist requests locally
* Support environment variables
* Avoid CORS issues via backend proxy
* Support external OAuth providers for authenticated API testing
* Support Server-Sent Events (SSE) endpoints for real-time streams

### Non-Goals (Initial Versions)

* Cloud sync
* User accounts / teams (beyond OAuth-backed identity)
* Collaboration
* API documentation generation
* Full automated test suites
* Marketplace or plugin store

### Goals

* Send HTTP requests (GET, POST, PUT, PATCH, DELETE)
* Edit headers and request bodies
* View responses clearly (status, headers, body, timing)
* Persist requests locally
* Support environment variables
* Avoid CORS issues via backend proxy

### Non-Goals (Initial Versions)

* Cloud sync
* User accounts / teams
* Collaboration
* API documentation generation
* Full automated test suites
* Marketplace or plugin store

---

## 3. Target Users

Primary:

* Backend developers
* Full-stack developers
* DevOps / platform engineers

Secondary (future):

* QA engineers
* Internal tooling teams

---

## 4. High-Level Architecture

### System Overview

Browser (Web UI)
↓
Backend API Proxy (Node.js)
↓
External APIs

Persistence:

* SQLite or JSON storage mounted as a Docker volume

### Why a Proxy Backend

* Avoid browser CORS limitations
* Centralised request logging
* Easier environment variable substitution
* Ability to extend later (assertions, auth helpers)

---

## 5. Technology Stack

### Frontend

* React
* TypeScript
* Vite
* TailwindCSS

Responsibilities:

* Request editor UI
* Environment variable management UI
* Response viewer
* Request history

### Backend

* Node.js
* Fastify

Responsibilities:

* Execute outbound HTTP requests

* Apply environment variable substitution

* Store and retrieve requests/history

* Handle OAuth flows server-side

* Proxy Server-Sent Events streams

* Serve frontend build (optional)

* Execute outbound HTTP requests

* Apply environment variable substitution

* Store and retrieve requests/history

* Serve frontend build (optional)

### Persistence

* SQLite (required)

* Direct SQL access (no ORM)

* Optional lightweight query helpers (e.g. better-sqlite3)

* Stored in a mounted Docker volume

* SQLite (preferred) OR JSON files

* Stored in a mounted Docker volume

### Infrastructure

* Docker
* docker-compose

---

## 6. Core Features (MVP)

### 6.1 Request Builder

* Method selector
* URL input
* Headers editor (key/value)
* Body editor (raw JSON/text)
* Send request action

### 6.2 Response Viewer

* Status code
* Response time
* Headers view
* Body view (pretty-print JSON if possible)

### 6.3 Request History

* Chronological list of executed requests
* Click to reload request into editor

### 6.4 Persistence

* Requests auto-saved
* History retained across restarts

### 6.5 Environment Variables

* Key/value pairs
* Usage via {{VARIABLE_NAME}}
* Basic global scope

### 6.6 OAuth Provider Support

* Ability to configure external OAuth providers (e.g. Keycloak, Auth0, Entra ID)
* OAuth flows handled server-side
* Access tokens stored locally and scoped per environment
* Token refresh handled automatically where supported

### 6.7 Server-Sent Events (SSE) Support

* Ability to open and observe SSE endpoints
* Live stream viewer in the UI
* Event log with timestamps
* Ability to stop/restart streams
* Optional header and auth support for SSE connections

### 6.1 Request Builder

* Method selector
* URL input
* Headers editor (key/value)
* Body editor (raw JSON/text)
* Send request action

### 6.2 Response Viewer

* Status code
* Response time
* Headers view
* Body view (pretty-print JSON if possible)

### 6.3 Request History

* Chronological list of executed requests
* Click to reload request into editor

### 6.4 Persistence

* Requests auto-saved
* History retained across restarts

### 6.5 Environment Variables

* Key/value pairs
* Usage via {{VARIABLE_NAME}}
* Basic global scope

---

## 7. Phase Breakdown

### Phase 1 — Foundation (Day 1)

**Goal:** Send a request and see a response

* Backend HTTP proxy endpoint
* Simple React UI
* Docker + docker-compose setup

Deliverable:

* Open browser
* Enter URL
* Click Send
* View response

---

### Phase 2 — Usability (Days 2–4)

* Header editor
* Request body editor
* Response formatting
* Request history
* Persistence layer

---

### Phase 3 — Environment Support (Days 5–6)

* Environment variable CRUD
* Variable substitution in URL, headers, body
* UI for managing variables

---

### Phase 4 — Polish & Quality (Optional)

* Keyboard shortcuts
* JSON validation
* Error handling improvements
* UI refinements

---

## 8. API Design (Backend)

### POST /proxy/request

Executes a standard HTTP request

Request:

* method
* url
* headers
* body

Response:

* status
* headers
* body
* duration

---

### POST /proxy/sse

Opens a Server-Sent Events stream

Request:

* url
* headers

Response:

* Streamed SSE events proxied to the UI

---

### GET /history

Returns stored request history

---

### POST /oauth/providers

Create or update OAuth provider configuration

### POST /oauth/token

Initiate OAuth flow or refresh access token

---

### POST /environments

Create/update environment variables

### POST /proxy/request

Executes an HTTP request

Request:

* method
* url
* headers
* body

Response:

* status
* headers
* body
* duration

### GET /history

Returns stored request history

### POST /environments

Create/update environment variables

---

## 9. Data Models (Initial)

> Note: Models are implemented directly via SQLite schemas and queries. Prisma and similar ORMs are explicitly out of scope.

### RequestRecord

* id
* method
* url
* headers
* body
* timestamp
* duration
* status

### EnvironmentVariable

* key
* value

---

## 10. Security Considerations

* Secrets and OAuth tokens stored locally only

* Tokens scoped per environment

* Optional encryption at rest for stored secrets

* No external network calls except user-triggered requests and OAuth flows

* SSE connections proxied to avoid exposing client credentials

* Clear separation between UI and outbound request execution

* Secrets stored locally only

* No external network calls except user-triggered requests

* Optional future encryption for stored variables

---

## 11. Naming

* Localman

---

## 12. Success Criteria

The project is successful when:

* It replaces Postman for basic API testing
* It starts in under 30 seconds
* It feels faster and simpler than existing tools

---

## 13. Future Enhancements (Out of Scope)

* Assertions
* Collections / folders
* Import/export
* Plugin system

---

## 14. Collaboration Guidance

* Prioritise simplicity over completeness
* Avoid premature abstraction
* Prefer explicit code over magic
* Don't use as any unless completely necessary
* Stop implementation when goals are met but before moving on double check the implementation
* Treat this as a personal productivity tool first
