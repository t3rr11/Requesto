---
title: CLI Reference
description: Complete reference for requesto run — flags, environment variables, reporters, exit codes and workspace behavior.
---

# CLI Reference

## `requesto run`

```
requesto run [PATH] [options]
```

`PATH` is your repository root (containing `.requesto`), the `.requesto` directory itself, or any directory inside them — it defaults to the current directory and walks up until a workspace is found. When `run` is invoked with no arguments at all, it uses the current directory: in the Requesto repo, `npm run cli` runs the repo's own suite.

### Selection

| Flag | Description |
|------|-------------|
| `-c, --collection <name>` | Run a specific collection (name or id). Repeatable. Default: all collections in workspace order. |
| `-f, --folder <name>` | Run only the named folder and its subfolders within the selected collections (name or id). Repeatable. |
| `-e, --environment <name>` | Environment to use (name or id), or `none`. Default: the workspace's active environment; in a fresh clone, the first environment in workspace order — the same fallback the app uses. |

### Variables

| Flag | Description |
|------|-------------|
| `--var <key=value>` | Override a variable. Repeatable. |
| `--var-file <path>` | Load overrides from a `.env` file (`KEY=VALUE`, `#` comments, quotes trimmed). |

Precedence, highest first:

1. Values set by scripts during the run (chaining) — these update the value *for subsequent requests*
2. `--var`
3. `--var-file`
4. `REQUESTO_VAR_*` environment variables
5. The environment's committed values

### Authentication

| Flag | Description |
|------|-------------|
| `--token <configId=token>` | Use this access token for the OAuth config, as-is. Repeatable. |
| `--oauth-secret <configId=secret>` | Client secret for a non-interactive OAuth config (client credentials / password). Repeatable. |
| `--refresh-token <configId=token>` | Seed a refresh token so an interactive-flow config can mint tokens headlessly. Repeatable. |

All three have environment-variable equivalents (see below), which is usually cleaner in pipelines.

### Run behavior

| Flag | Description |
|------|-------------|
| `-x, --bail` | Stop the run after the first failed or errored request. Remaining requests are reported as skipped. |
| `--insecure` | Skip TLS certificate verification (self-signed certificates). |
| `--timeout <ms>` | Per-request timeout. Default: 30000. |
| `--persist` | Write OAuth tokens acquired during the run to `.requesto/local/oauth-tokens.json`. Default: memory only. |
| `--reporter <spec>` | `console`, `junit:<path>` or `json:<path>`. Repeatable. Default: `console`. |
| `--isolated <serverUrl>` | Run inside a scratch workspace on the Requesto server at `<serverUrl>`. See below. |

### Isolated runs (`--isolated`)

When a suite creates or deletes collections, environments or workspaces on a Requesto server that is also being used by real people (or the desktop app), those changes would be visible in — and destructive to — the active workspace. `--isolated` avoids that:

1. Before the run, the CLI creates a scratch workspace on the target server and activates it. The scratch workspace **inherits the previously active workspace's environments and OAuth configurations** (including stored client secrets and cached tokens), so requests behave exactly as they would outside the run.
2. The whole run happens inside that scratch workspace.
3. Afterwards — even when the run fails — the previously active workspace is restored and the scratch workspace is deleted.

```bash
requesto run . --isolated http://localhost:4747
```

The [Collection Runner](/features/collection-runner) in the app is **always** isolated. The CLI makes it opt-in via `--isolated <serverUrl>` because it can also target APIs that aren't Requesto servers — but the repo's own `npm run cli` script enables it by default.

### Workspace behavior

The CLI is read-only by default:

- Request history is **not** written.
- Environment "current values" from scripts live only for the duration of the run — your working copy is untouched.
- OAuth tokens are held in memory unless `--persist` is set.

## Environment variables

Each flag-based credential has an env-var equivalent. Matching is case-insensitive; non-alphanumeric characters in ids/keys become `_`.

| Variable | Equivalent | Example |
|----------|------------|---------|
| `REQUESTO_TOKEN_<CONFIGID>` | `--token` | config `my-entra` → `REQUESTO_TOKEN_MY_ENTRA` |
| `REQUESTO_OAUTH_SECRET_<CONFIGID>` | `--oauth-secret` | config `my-api` → `REQUESTO_OAUTH_SECRET_MY_API` |
| `REQUESTO_REFRESH_TOKEN_<CONFIGID>` | `--refresh-token` | config `my-entra` → `REQUESTO_REFRESH_TOKEN_MY_ENTRA` |
| `REQUESTO_VAR_<KEY>` | `--var` | variable `apiToken` → `REQUESTO_VAR_APITOKEN` |

Env vars are the lowest-precedence source of variable overrides — explicit `--var` / `--var-file` win.

## Reporters

### `console`

Streams results as the run unfolds: each request prints while it is in flight (`⋯ name …`) and completes in place with its HTTP status, duration, and the full list of tests — passed and failed — so a slow or hung request is visible immediately. A summary block closes the run. Colours are disabled automatically when output is not a terminal or `NO_COLOR` is set.

### `junit:<path>`

Writes a JUnit XML file for CI test reporting:

- One `<testsuite>` per collection.
- Each `test()` assertion becomes a `<testcase>`; failures carry a `<failure>` element with the assertion message.
- Requests without a test script become a single `<testcase>` named `Request: <name>`.
- Request-level errors (connection refused, timeouts) become `<error>` elements.

Attach it to your CI's test-report step (GitHub Actions: [dorny/test-reporter](https://github.com/dorny/test-reporter) with `reporter: java-junit`; GitLab: `artifacts:reports:junit`; Azure DevOps: **Publish Test Results** task).

### `json:<path>`

Writes the full run report as JSON for custom processing — Slack summaries, dashboards, deployment gates — anywhere the native CI test-report integrations don't reach:

```json
{
  "summary": {
    "requests": { "executed": 26, "passed": 26, "failed": 0, "errored": 0, "skipped": 0 },
    "tests": { "total": 69, "passed": 69 },
    "environment": "staging",
    "bailTriggered": false,
    "durationMs": 1007,
    "finishedAt": "2026-08-31T10:19:52.358Z"
  },
  "results": [
    {
      "collection": "Server Health",
      "request": "Health Check",
      "requestId": "req-api-health",
      "method": "GET",
      "url": "{{baseUrl}}/health",
      "status": "passed",
      "httpStatus": 200,
      "durationMs": 11,
      "error": null,
      "tests": [{ "name": "status is 200", "passed": true, "error": null }]
    }
  ]
}
```

Notes:

- `url` is the request's **saved** URL with variables unresolved — the report is safe to attach as a CI artifact even when variables carry secrets.
- Reporters combine: `--reporter console --reporter junit:report.xml --reporter json:report.json` streams to the terminal *and* writes both files.
- Write reports to an artifacts path (or `.gitignore` them) — they're run outputs, not source.

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | All executed requests passed. |
| `1` | One or more requests failed their tests, errored, or could not authenticate. |
| `2` | Configuration error — workspace not found, unknown collection/environment, malformed flag values. |

## Script sandbox

Test and pre-request scripts run in an isolated worker thread with the same API as the app: `test(name, fn)`, `expect(...)` with the standard matchers, `response.{status,statusText,headers,body,duration,json()}`, `request` and `environment.{get,set}`. Scripts that can run in the app run identically in the CLI. See [Tests](/features/tests) and [Pre-request Scripts](/features/pre-request-scripts).
