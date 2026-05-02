---
title: Pre-request Scripts
description: Run JavaScript before each request in Requesto. Use pre-request scripts to set environment variables dynamically, such as tokens, timestamps, or computed values, without polluting git history.
---

# Pre-request Scripts

Run a small JavaScript snippet before a request is sent. Pre-request scripts are useful for setting environment variables dynamically - for example, generating a timestamp, computing a signature, or reading a value that changes between requests.

## Where to Write Scripts

Open a saved request and click the **Pre-request** tab in the request form. A dot appears on the tab label when a script is present.

<ThemeImage src="/pre-request-scripts/editor.png" alt="Pre-request script editor" />

The editor provides autocompletion for all available globals.

## Available Globals

### `environment`

Read and write variables in the active environment.

| Method | Description |
|--------|-------------|
| `environment.get(key)` | Returns the current value of `key`, or an empty string if the variable does not exist |
| `environment.set(key, value)` | Sets the current value of `key` in the active environment |

`environment.set()` writes to the variable's **current value**, which is a local override stored separately from the committed `environments.json` file. This means scripts never cause unintended git changes. See [Environments: Initial Value and Current Value](/features/environments#initial-value-and-current-value) for details.

### `request`

Read-only view of the outgoing request.

| Property | Type | Description |
|----------|------|-------------|
| `request.method` | `string` | HTTP method, e.g. `"GET"` |
| `request.url` | `string` | Full URL before variable substitution |
| `request.headers` | `Record<string, string> \| undefined` | Request headers |
| `request.body` | `string \| undefined` | Raw request body |

## Example

```js
// Set a timestamp for use in a signed request
environment.set('timestamp', new Date().toISOString());

// Compute a derived value from an existing variable
const baseToken = environment.get('apiToken');
environment.set('authHeader', 'Bearer ' + baseToken);
```

After the script runs, any variables set with `environment.set()` are applied before variable substitution happens. This means you can set <code v-pre>{{timestamp}}</code> in a header and the pre-request script will supply its value.

## Execution Order

1. Pre-request script runs
2. Environment variables are updated with any overrides from the script
3. Variable substitution replaces <code v-pre>{{placeholders}}</code> in the URL, headers, and body
4. The request is sent

## Limitations

- Scripts time out after **5 seconds**
- No network access (`fetch` and `XMLHttpRequest` are not available)
- No `require` or `import` - scripts run in an isolated sandbox
- No `async`/`await` - scripts must be synchronous
- Only enabled variables in the active environment are visible to `environment.get()`
