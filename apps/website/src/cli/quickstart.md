---
title: CLI Quickstart
description: Get a Requesto collection running in a CI pipeline in five minutes — variables, tests, reports and exit codes.
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
    └── local/          # gitignored — never needed by the CLI
```

If you've been developing requests and tests in the app, you already have everything. Commit the `.requesto` directory (except `local/`, which is gitignored by default).

## 2. Run it locally first

From a checkout of Requesto (after `npm install && npm run build:cli`), `npm run cli` runs the repo's own regression suite — with isolation enabled by default, against the server at `http://localhost:4747`:

```bash
cd Requesto
npm run cli
```

If no server is running there, the command fails fast with a clear message rather than running unprotected.

To point the CLI at another workspace, pass a path and flags after `--`:

```bash
cd your-repo
npm run cli -- run . --environment staging
```

Or straight from the published image:

```bash
cd your-repo
docker run --rm -v "$PWD/.requesto:/work/.requesto" ghcr.io/t3rr11/requesto-cli:latest run
```

You'll see the same per-request results as the Collection Runner:

```
Collection: Users API
  ✓ List Users                          200 OK  142ms  (2 tests)
  ✗ Create User                         201 Created  89ms  (1 test)
      ✗ response has an id
        Expected undefined to be defined

Summary: 1/2 requests passed · 2/3 tests passed (0.24s)
```

Exit code: `0` when everything passes, `1` on any failure or error.

## 3. Point it at a test environment

The `--environment` flag selects an environment by name (or id). Use `--var` to override individual variables — in pipelines these come from CI secrets:

```bash
docker run --rm \
  -v "$PWD/.requesto:/work/.requesto" \
  -e API_TOKEN \
  ghcr.io/t3rr11/requesto-cli:latest run \
    --environment staging \
    --var "baseUrl=https://staging.example.com" \
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

      - name: Run Requesto tests
        uses: addnab/docker-run-action@v3
        with:
          image: ghcr.io/t3rr11/requesto-cli:latest
          options: -v ${{ github.workspace }}/.requesto:/work/.requesto
          run: run --environment staging --reporter junit:/reports/junit.xml
```

A simpler pattern that also captures the JUnit report — run the image directly with a reports volume:

```yaml
      - name: Run Requesto tests
        run: |
          docker run --rm \
            -v "$PWD/.requesto:/work/.requesto" \
            -v "$PWD/test-results:/reports" \
            ghcr.io/t3rr11/requesto-cli:latest \
            run --environment staging --reporter junit:/reports/junit.xml

      - name: Publish test report
        uses: dorny/test-reporter@v1
        if: always()
        with:
          name: Requesto tests
          path: test-results/junit.xml
          reporter: java-junit
```

## 5. Authentication

If your requests use bearer tokens or API keys, they're just variables — pass them with `--var` as above.

If your requests use OAuth (e.g. Microsoft Entra ID with PKCE), the browser sign-in can't happen in CI — but your pipeline can supply a ready token instead:

```bash
--token my-entra=<access token>
```

This is covered in [CI Authentication](/cli/ci), including a complete Entra ID example.
