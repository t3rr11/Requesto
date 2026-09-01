---
title: CLI Overview
description: Run your Requesto collections from the terminal or CI pipelines with the Requesto CLI, as an npm package or Docker image.
---

# CLI Overview

The Requesto CLI runs your [collections](/features/collections) and their [test scripts](/features/tests) headless: the same requests, the same scripts, the same environments as the desktop app, but from a terminal or CI pipeline.

```bash
requesto run
```

If a test fails or a request errors, the CLI exits with a non-zero code and can emit a JUnit report for your CI system. The test suite you build while developing your API becomes the test suite your pipeline runs on every commit.

## The mental model

| In the app | In the CLI |
|---|---|
| Collection Runner dialog | `requesto run` |
| Active environment | `--environment <name>` |
| Variables you type into the environment | `--var`, `--var-file`, or `REQUESTO_VAR_*` env vars |
| OAuth sign-in popup | `--token`, `--oauth-secret`, or `--refresh-token` (see [CI Authentication](/cli/ci)) |
| Runner results table | Console report + JUnit XML |

Everything the CLI needs lives in your repository's `.requesto` directory: collections, environments and OAuth configs are files you already commit. The CLI never writes to your workspace and never touches a server's real data. See [Isolation](#isolation) below.

## Isolation

A run can create, modify or delete things. The CLI guarantees that none of it escapes the run:

- Your `.requesto` workspace is treated as read-only. Environment changes made by scripts, request history and OAuth tokens live in memory for the duration of the run only.
- Collections that target a Requesto API use the built-in `{{requestoServerUrl}}` variable. When a run needs it, the CLI boots its own ephemeral Requesto server (seeded from your workspace) on a random local port and tears it down afterwards. Everything the run does to that server lands in a temporary copy and is deleted at the end.
- Collections that target your own APIs (SIT, UAT, localhost) just hit those URLs. Nothing is intercepted and nothing on a shared server is touched.
- Testing a *deployed* Requesto server with `--server <url>` is the one case where the run targets a server it does not own. The CLI protects it by creating a scratch workspace for the duration of the run and restoring the previous one afterwards.

## Requesto tests itself with it

The [tests workflow](https://github.com/t3rr11/Requesto/blob/main/.github/workflows/tests.yml) runs the repository's own `.requesto` collections against the embedded scratch server on every push. No separate backend is started: the CLI boots one itself. The [Quickstart](/cli/quickstart) shows you how to set up the same loop for your API.

## Install

**npm (recommended):**

```bash
npm i -D @requesto/cli
```

Then add a script to your `package.json`:

```json
{
  "scripts": {
    "test:api": "requesto run --environment staging"
  }
}
```

Or run it directly:

```bash
npx requesto run --environment staging
```

**Docker:**

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
npm run cli
```

## Authentication

If your requests use plain tokens or API keys (bearer, basic, API key), they are just environment variables: pass them with `--var`. There is no separate auth flag needed.

Requests saved with an OAuth config work identically to the app: the config is referenced by its id, and in a pipeline you supply the token yourself rather than signing in with a browser:

```bash
npx requesto run --token my-entra=<accessToken>
```

Here `my-entra` is the **id of the OAuth config** the request uses (visible in the app's OAuth settings); the value after `=` is the access token to use in its place. The CLI applies it to every request pointing at that config. Environment variables (`REQUESTO_TOKEN_<CONFIGID>`), client secrets and refresh tokens are covered in [CI Authentication](/cli/ci).

## What's next

- [Quickstart](/cli/quickstart): get a green pipeline in five minutes
- [CI Authentication](/cli/ci): OAuth, Entra ID and secrets without leaking them
- [CLI Reference](/cli/reference): every flag, env var and exit code
- [Docker Image](/cli/docker): image tags, mounts and usage patterns
