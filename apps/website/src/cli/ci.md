---
title: CI Authentication
description: How the Requesto CLI handles OAuth, Entra ID and secrets in pipelines, token substitution, client credentials and env var injection.
---

# Authentication in CI

The desktop app signs you in with a browser. A pipeline has no browser and no user session, so the CLI resolves authentication differently, without changing anything about your requests.

The key idea: **your requests never change**. A request saved with `auth: { type: "oauth", configId: "my-entra" }` works identically in the app and in the CLI. What changes is *where the token comes from*.

## How the CLI resolves a token

For every request that needs a token, the CLI tries, in order:

1. **Explicit override**: a token passed with `--token <configId>=<token>` or the `REQUESTO_TOKEN_*` environment variable. Used as-is, applied exactly as the app would apply it.
2. **Non-interactive flows**: for OAuth configs using *client credentials* or *password* grants (or with a usable refresh token), the CLI fetches/refreshes the token itself, using the client secret you inject.
3. **Fail fast with guidance**: interactive flows (authorization code + PKCE, implicit) can't open a browser. The CLI fails that request with instructions instead of hanging or silently skipping.

## Which option do I need?

```
Does your request use OAuth?
├── No (bearer / basic / api-key)  →  pass values as variables: --var apiToken=...
├── Yes, my IdP gives me a token in the pipeline (Entra ID, cloud CLIs)
│       →  --token <configId>=<token>          (option 1)
├── Yes, confidential client with a client secret
│       →  --oauth-secret <configId>=<secret>  (option 2)
└── Yes, interactive flow, but I have a long-lived refresh token
        →  --refresh-token <configId>=<token>   (option 2)
```

## Option 1: Pass a ready token (`--token`)

The most robust pattern. Your pipeline is often *already authenticated* to your identity provider, let it fetch the token, and hand it to Requesto.

### Microsoft Entra ID + Azure DevOps

Entra app registrations created as *SPA / public client* platforms only support PKCE, a browser flow, which is exactly what pipelines can't do. Instead, fetch a token for your API's service principal and inject it:

```yaml
- task: AzureCLI@2
  name: token
  inputs:
    azureSubscription: my-service-connection
    scriptType: bash
    script: |
      echo "##vso[task.setvariable variable=ENTRA_TOKEN;issecret=true]$(az account get-access-token --resource api://my-api --query accessToken -o tsv)"

- script: |
    docker run --rm \
      -v $PWD/.requesto:/work/.requesto \
      -e REQUESTO_TOKEN_MY_ENTRA \
      ghcr.io/t3rr11/requesto-cli:latest \
      run --environment staging --reporter junit:/reports/junit.xml
```

The environment variable `REQUESTO_TOKEN_MY_ENTRA` corresponds to the OAuth config with id `my-entra` (matching is case-insensitive; any character that isn't a letter, digit or underscore becomes `_`).

### Microsoft Entra ID + GitHub Actions

```yaml
- uses: azure/login@v2
  with:
    creds: ${{ secrets.AZURE_CREDENTIALS }}

- name: Get token
  id: token
  run: |
    TOKEN=$(az account get-access-token --resource api://my-api --query accessToken -o tsv)
    echo "::add-mask::$TOKEN"
    echo "token=$TOKEN" >> "$GITHUB_OUTPUT"

- name: Run Requesto tests
  run: |
    docker run --rm \
      -v "$PWD/.requesto:/work/.requesto" \
      -e ENTRA_TOKEN \
      ghcr.io/t3rr11/requesto-cli:latest \
      run --environment staging
  env:
    ENTRA_TOKEN: ${{ steps.token.outputs.token }}
```

Or skip the indirection and mount a `.env` file: `--var-file` (see [CLI Reference](/cli/reference)).

## Option 2: Non-interactive OAuth flows

If your OAuth config uses the **client credentials** grant (a confidential client with a secret) the CLI can fetch and refresh tokens by itself. Provide the secret, which the app stores in the gitignored `local/oauth-secrets.json`, in CI, inject it instead:

```bash
docker run --rm \
  -v "$PWD/.requesto:/work/.requesto" \
  -e REQUESTO_OAUTH_SECRET_MY_API \
  ghcr.io/t3rr11/requesto-cli:latest run
```

or explicitly: `--oauth-secret my-api=<secret>`.

Notes:

- Token caching and refresh behave exactly as in the app. By default acquired tokens are kept **in memory only**; add `--persist` to write them back to `.requesto/local/oauth-tokens.json` (useful when a cache volume is mounted).
- The **password** grant works the same way when credentials are stored in the config's additional parameters.
- A **refresh token** can be seeded for an otherwise-interactive config: `--refresh-token my-entra=<refresh-token>` (or `REQUESTO_REFRESH_TOKEN_MY_ENTRA`). Use a long-lived refresh token from a one-time interactive sign-in.

## What happens when it can't authenticate

A request whose OAuth config needs a browser and has no override fails individually with a message like:

```
OAuth config "my-entra" uses the "authorization-code-pkce" flow, which requires
a browser and cannot run headless.
Options:
  1. Pass a ready access token:  --token my-entra=<accessToken>  (or REQUESTO_TOKEN_* env var)
  ...
```

The run continues with the remaining requests, the report marks the failure, and the exit code is `1`.

## Secrets checklist

- Never commit `local/`, it's gitignored and contains secrets and token caches.
- Inject secrets via your CI's secret store (`REQUESTO_*` env vars or `--var-file` from a secret file).
- Mask tokens in build logs (e.g. `echo "::add-mask::$TOKEN"` in GitHub Actions).
- Prefer short-lived, per-run tokens fetched by the pipeline over long-lived static secrets.
