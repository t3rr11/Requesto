# @requesto/cli

Run your [Requesto](https://requesto.com.au) collections from the terminal and CI pipelines. The test suite you build in the Requesto desktop app (collections, environments, test scripts) becomes the test suite your pipeline runs on every commit.

## Install

```bash
npm i -D @requesto/cli
```

Add a script to your `package.json`:

```json
{
  "scripts": {
    "test:api": "requesto run --environment staging"
  }
}
```

Or run it straight away:

```bash
npx requesto run
```

## How it works

`requesto run` walks up from the current directory until it finds a `.requesto` workspace (created by the [Requesto desktop app](https://github.com/t3rr11/Requesto)), then executes the collections and test scripts inside it with the same engine the app uses: pre-request scripts, variable substitution, OAuth, and `test()`/`expect()` assertions.

The run is isolated by construction:

- Your `.requesto` workspace is read-only. Script environment changes, request history and OAuth tokens live in memory for the run only.
- Collections targeting the built-in `{{requestoServerUrl}}` variable run against an ephemeral Requesto server the CLI boots itself (seeded from your workspace on a random local port, torn down afterwards).
- `--server <url>` tests a deployed Requesto server instead; its active workspace is protected by a scratch workspace for the duration of the run.

## Common flags

```bash
requesto run [PATH] [options]
```

| Flag | Description |
|------|-------------|
| `-c, --collection <name>` | Run a specific collection (name or id). Repeatable. |
| `-C, --exclude-collection <name>` | Skip a collection. Repeatable. |
| `-f, --folder <name>` | Run only a folder and its subfolders. Repeatable. |
| `-e, --environment <name>` | Environment to use, or `none`. Default: the active environment. |
| `--var <key=value>` | Override a variable. Repeatable. |
| `--var-file <path>` | Load variable overrides from a `.env` file. |
| `--token <configId=token>` | Access token for an OAuth config (e.g. `--token my-entra=eyJ...`). |
| `--oauth-secret <configId=secret>` | Client secret for non-interactive OAuth flows. |
| `-x, --bail` | Stop after the first failed or errored request. |
| `--insecure` | Skip TLS certificate verification. |
| `--reporter <spec>` | `console` (default), `verbose`, `dot`, `junit:<path>`, `json:<path>`. Repeatable. |
| `--server <url>` | Test a deployed Requesto server instead of the embedded one. |

OAuth configs that normally need a browser fail fast with instructions rather than hanging; your pipeline can supply ready tokens, client secrets or refresh tokens instead. `REQUESTO_TOKEN_*`, `REQUESTO_OAUTH_SECRET_*`, `REQUESTO_REFRESH_TOKEN_*` and `REQUESTO_VAR_*` environment variables mirror the flags.

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | All executed requests passed. |
| `1` | One or more requests failed their tests, errored, or could not authenticate. |
| `2` | Configuration error (no workspace found, unknown collection or environment, bad flag values). |

## Example pipeline output

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

## Docker

A container image is published alongside the npm package:

```bash
docker run --rm \
  -v "$PWD/.requesto:/work/.requesto" \
  ghcr.io/t3rr11/requesto-cli:latest run --environment staging
```

## Documentation

Full documentation (quickstart, CI authentication with Entra ID, reporters, Docker) can be found on the website under [Requesto CLI](https://requesto.com.au/cli)

## License

MIT
