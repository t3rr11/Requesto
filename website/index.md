---
layout: home

hero:
  name: Requesto
  text: A lightweight, self-hosted API client
  tagline: Test, debug, and document your APIs with a modern, privacy-focused tool
  image:
    src: /logo.svg
    alt: Requesto Logo
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: Download
      link: /download
    - theme: alt
      text: View on GitHub
      link: https://github.com/t3rr11/Requesto

features:
  - title: Self-Hosted & Private
    details: Your data stays on your infrastructure. Run it in Docker or as a desktop app. No telemetry, no external dependencies.
  
  - title: Collections & Folders
    details: Organize requests with drag-and-drop collections and folders. Import/export for team collaboration and version control.
  
  - title: OAuth 2.0 Support
    details: Built-in OAuth 2.0 with all grant types including PKCE. Automatic token refresh and secure storage.
  
  - title: Environment Variables
    details: Manage multiple environments (dev, staging, prod) with variable substitution in URLs, headers, and bodies.
  
  - title: Request History
    details: Full request/response logging with search and replay capabilities. Never lose track of your API tests.
  
  - title: Modern UI
    details: Clean, dark-mode-first interface built with React and TailwindCSS. Intuitive and fast.
---

## Why Requesto?

Requesto is designed for developers who need a reliable API testing tool without sacrificing privacy. Unlike cloud-based alternatives:

- **100% Self-Hosted** - Your sensitive API keys and requests never leave your infrastructure
- **No Account Required** - No sign-ups, no tracking, no external dependencies
- **Open Source** - MIT licensed, audit the code, contribute features
- **Developer-First** - Fast, keyboard-friendly, built by developers for developers

## Quick Start

### Desktop App

Download the latest release for Windows, macOS, or Linux from the [Downloads page](/download).

### Docker

```bash
docker run -d \
  -p 3000:3000 \
  -v requesto-data:/app/data \
  ghcr.io/t3rr11/requesto:latest
```

### From Source

```bash
git clone https://github.com/t3rr11/Requesto.git
cd Requesto
npm install
npm run dev
```

## Features at a Glance

<div class="feature-grid">
  <div class="feature-card">
    <h3>Request Types</h3>
    <p>GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS</p>
  </div>
  <div class="feature-card">
    <h3>Body Formats</h3>
    <p>JSON, Form Data, URL Encoded, Raw, Binary</p>
  </div>
  <div class="feature-card">
    <h3>Authentication</h3>
    <p>Basic, Bearer, API Key, OAuth 2.0</p>
  </div>
  <div class="feature-card">
    <h3>Real-Time</h3>
    <p>Server-Sent Events (SSE) support</p>
  </div>
</div>

<style>
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 2rem;
}

.feature-card {
  padding: 1.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.feature-card h3 {
  margin-top: 0;
  font-size: 1.1rem;
}

.feature-card p {
  margin-bottom: 0;
  color: var(--vp-c-text-2);
}
</style>
