---
title: CLI Quickstart
description: Get a Requesto collection running in a CI pipeline in five minutes with variables, tests, reports and exit codes.
---

# Quickstart

This guide takes a repo that already has a `.requesto` workspace (created by the desktop app) and runs its collections in CI.

## 1. Find your test suite

Your workspace lives at the root of your repository:

```
your-repo/
└── .requesto/
    ├── collections/
    ├── environments/
    ├── oauth-configs/
    ├── order.json
    └── local/          # gitignored, never needed by the CLI
```

If you've been developing requests and tests in the app, you already have everything. Commit the `.requesto` directory (except `local/`, which is gitignored by default).

## 2. Run it locally

Install the CLI as a dev dependency and run it from your repo root:

```bash
npm i -D @requesto/cli
npx requesto run
```

The CLI walks up from the current directory until it finds a `.requesto` folder, so running from a subdirectory works too. Requests execute against the URLs in your environments, exactly as they do in the app.

You'll see results stream in as each request completes:

```
Users API
 ✓ List Users (142ms)
 ✗ Create User (89ms)
    ✗ response has an id: Expected undefined to be defined

 Failed Requests (1)

  Users API > Create User
    ✗ response has an id: Expected undefined to be defined

 Requests  1 passed, 1 failed (2 executed)
 Tests     2/3 passed
 Duration  0.24s
```

Exit code: `0` when everything passes, `1` on any failure or error, `2` on a configuration mistake.

If your collections target a Requesto API, point them at `{{requestoServerUrl}}` instead of a hardcoded URL. The CLI then boots its own scratch server for the run. See the [Reference](/cli/reference#the-requestoserverurl-variable).

## 3. Point it at a test environment

The `--environment` flag selects an environment by name (or id). For SIT, UAT or staging, create one environment per target in the app and pick it here. Use `--var` to override individual variables; in pipelines these come from CI secrets:

```bash
npx requesto run \
  --environment staging \
  --var "apiToken=$API_TOKEN"
```

## 4. Wire it into your pipeline

**GitHub Actions:**

```yaml
jobs:
  api-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: npm

      - name: Run Requesto tests
        run: npx requesto run --environment staging --reporter junit:test-results/junit.xml

      - name: Publish test report
        uses: dorny/test-reporter@v1
        if: always()
        with:
          name: Requesto tests
          path: test-results/junit.xml
          reporter: java-junit
```

Prefer containers? Run the [Docker image](/cli/docker) directly:

```yaml
      - name: Run Requesto tests
        run: |
          docker run --rm \
            -v "$PWD/.requesto:/work/.requesto" \
            -v "$PWD/test-results:/reports" \
            ghcr.io/t3rr11/requesto-cli:latest \
            run --environment staging --reporter junit:/reports/junit.xml
```

## 5. Authentication

If your requests use bearer tokens or API keys, they're just variables: pass them with `--var` as above.

If your requests use OAuth (e.g. Microsoft Entra ID with PKCE), the browser sign-in can't happen in CI, but your pipeline can supply a ready token instead:

```bash
npx requesto run --token my-entra=<access token>
```

`my-entra` is the id of the OAuth config your request uses (the same id shown in the app's OAuth settings); the value after `=` is the access token to apply instead of signing in. This is covered in [CI Authentication](/cli/ci), including a complete Entra ID example.
