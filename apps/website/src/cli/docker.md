---
title: Docker Image
description: The official Requesto CLI Docker image, tags, volume mounts, users and pipeline usage patterns.
---

# Docker Image

The official image bundles the CLI and the request engine. Nothing else is needed, mount your repository and run.

Two registries are published in lockstep on every release:

- `ghcr.io/t3rr11/requesto-cli`
- `terrii/requesto-cli` (Docker Hub)

Tags: `latest` and the release version (e.g. `1.7.0`). Pin a version in pipelines for reproducible builds.

## Basic usage

```bash
docker run --rm \
  -v "$PWD/.requesto:/work/.requesto" \
  ghcr.io/t3rr11/requesto-cli:latest \
  run --environment staging
```

- `/work` is the working directory and the default place to mount your repository.
- You can mount the repo root instead and pass the path: `-v "$PWD:/src" requesto-cli run /src`.
- The container runs as the non-root `node` user.
- `ENTRYPOINT` is `requesto`, so everything after the image name is CLI arguments.

## Passing secrets

Credentials should be injected as environment variables rather than baked into images:

```bash
docker run --rm \
  -v "$PWD/.requesto:/work/.requesto" \
  -e REQUESTO_TOKEN_MY_ENTRA \
  -e REQUESTO_VAR_BASEURL \
  ghcr.io/t3rr11/requesto-cli:latest run
```

`-e VAR` (without a value) forwards the variable from the host into the container. See [CI Authentication](/cli/ci) and [CLI Reference](/cli/reference#environment-variables).

## Reports

Mount a reports directory so JUnit output survives the container:

```bash
docker run --rm \
  -v "$PWD/.requesto:/work/.requesto" \
  -v "$PWD/test-results:/reports" \
  ghcr.io/t3rr11/requesto-cli:latest \
  run --reporter junit:/reports/junit.xml
```

## Caching OAuth tokens across runs

With `--persist`, tokens acquired during the run are written to `.requesto/local/oauth-tokens.json`. Mount a cache volume to avoid re-fetching tokens on every run:

```bash
docker volume create requesto-cli-cache

docker run --rm \
  -v "$PWD/.requesto:/work/.requesto" \
  -v requesto-cli-cache:/cache \
  -e REQUESTO_OAUTH_SECRET_MY_API \
  ghcr.io/t3rr11/requesto-cli:latest \
  run --persist
```

Because `--persist` writes into the mounted workspace, you can also simply keep `.requesto/local/` on a persistent volume in ephemeral workspaces.

## Networking

The container reaches your APIs directly, for localhost APIs on the host, use `host.docker.internal` (Docker Desktop) or run the container on the host network (`--network host`, Linux). Example:

```bash
docker run --rm \
  -v "$PWD/.requesto:/work/.requesto" \
  ghcr.io/t3rr11/requesto-cli:latest \
  run --var "baseUrl=http://host.docker.internal:3000"
```

## Image contents

- Node 24 on Alpine, running as a non-root user.
- A single-file bundle of the CLI, the shared request engine and the backend internals it needs. There is no node_modules tree, no dev tooling, and no shell utilities beyond the base image.
- The image contains the request engine, variable substitution, script sandbox and OAuth client. It does **not** include the Requesto web UI or a server; no ports are exposed.
