---
title: CLI Overview
description: Run your Requesto collections headless in CI pipelines with the Requesto CLI and its official Docker image.
---

# CLI Overview

The Requesto CLI runs your [collections](/features/collections) and their [test scripts](/features/tests) headless — the same requests, the same scripts, the same environments as the desktop app, but from a terminal or CI pipeline.

```bash
requesto run .
```

If a test fails or a request errors, the CLI exits with a non-zero code and can emit a JUnit report for your CI system. That's the whole point: the test suite you build while developing your API becomes the test suite your pipeline runs on every commit.

## The mental model

| In the app | In the CLI |
|---|---|
| Collection Runner dialog | `requesto run` |
| Active environment | `--environment <name>` |
| Variables you type into the environment | `--var`, `--var-file`, or `REQUESTO_VAR_*` env vars |
| OAuth sign-in popup | `--token`, `--oauth-secret`, or `--refresh-token` (see [CI Authentication](/cli/ci)) |
| Runner results table | Console report + JUnit XML |

Everything the CLI needs lives in your repository's `.requesto` directory — collections, environments and OAuth configs are files you already commit. The CLI never writes to your workspace unless you ask it to.

## Requesto tests itself with it

The [`Tests` workflow](https://github.com/t3rr11/Requesto/blob/main/.github/workflows/tests.yml) boots a fresh Requesto backend on every push and runs the repository's own `.requesto` collections against it with the CLI — using `--isolated` so the run happens in a scratch server-side workspace and nothing touches the application's real data. The [Quickstart](/cli/quickstart) shows you how to set up the same loop for your API.

## Install

**Docker (recommended for pipelines):**

```bash
docker run --rm \
  -v "$PWD/.requesto:/work/.requesto" \
  ghcr.io/t3rr11/requesto-cli:latest run --environment staging
```

See [Docker Image](/cli/docker) for details.

**From source (Node 24+):**

```bash
git clone https://github.com/t3rr11/Requesto
cd Requesto
npm install
npm run build:cli
npm run cli -- run /path/to/your/repo
```

## What's next

- [Quickstart](/cli/quickstart) — get a green pipeline in five minutes
- [CI Authentication](/cli/ci) — OAuth, Entra ID and secrets without leaking them
- [CLI Reference](/cli/reference) — every flag, env var and exit code
- [Docker Image](/cli/docker) — image tags, mounts and usage patterns
