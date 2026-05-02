---
title: Environments
description: Manage API environments in Requesto. Define variable sets for dev, staging, and production, then swap them without editing individual requests. Supports secret masking and variable substitution.
---

# Environments

Switch between sets of variables (dev, staging, production) without editing individual requests.

## How It Works

An environment is a named collection of key-value variables. When you send a request, the backend substitutes any <code v-pre>{{variable_name}}</code> placeholders in the URL, headers, and body with the values from the **active** environment.

```
URL:    {{base_url}}/users/{{user_id}}
Header: Authorization: Bearer {{api_token}}
```

If the active environment has `base_url = https://api.example.com`, `user_id = 42`, and `api_token = sk_abc123`, the outgoing request becomes:

```
GET https://api.example.com/users/42
Authorization: Bearer sk_abc123
```

## Managing Environments

<ThemeImage src="/environments/manage-dialog.png" alt="Manage Environments dialog" />

Open the **Manage Environments** dialog from the Environments page (or the environment selector in the header).

**Sidebar actions:**
- **New Environment** - creates an empty environment
- **Import** - load an environment from a JSON file

**Per-environment actions** (buttons in the environment header):
- **Set Active** - choose which environment supplies variable values
- **Duplicate** - copy an environment with all its variables
- **Export** - download the environment as a JSON file
- **Delete** - remove the environment (with confirmation)
- **Rename** - right-click an environment in the sidebar list (or use the **⋯** menu in the environment header) and choose **Rename** to edit its name in a dialog

## Variables

Each variable has:

| Field | Description |
|-------|-------------|
| Key | The name you reference with <code v-pre>{{key}}</code> |
| Value | The substituted value |
| Enabled | Toggle - disabled variables are skipped during substitution |
| Secret | Toggle - masks the value in the UI (eye icon to reveal) |

Add variables in the editor table. Click the **+** row to add a new one, or remove with the trash icon.

<ThemeImage src="/environments/variable-editor.png" alt="Variable editor table" />

## Variable Autocomplete

The `VariableAwareInput` fields throughout the app (URL bar, header values, etc.) show an autocomplete dropdown when you start typing a variable reference. It lists all variables from the active environment so you can pick the right name.

<ThemeImage src="/environments/autocomplete.png" alt="Variable autocomplete" />

## Switching Environments

Use the **environment selector** dropdown in the header bar. Selecting a different environment changes which variables are substituted - you don't need to edit any requests.

<ThemeImage src="/environments/selector-dropdown.png" alt="Environment selector dropdown" />

## Initial Value and Current Value

Each environment variable has two value fields:

| Field | Description |
|-------|-------------|
| **Value** | The initial value. This is stored in `environments.json` and committed to git when you sync your workspace. |
| **Current Value** | A local override. Stored separately in a sidecar file that is excluded from git by default. |

When a request is sent, the current value takes precedence over the initial value if one is set. If no current value exists, the initial value is used.

The current value column is visible in the variable editor table.

### Why This Matters for Scripts

Pre-request scripts and test scripts use `environment.set()` to update variables at runtime. These writes always go to the current value, never to the initial value. This means:

- Tokens, timestamps, and session IDs set by scripts stay local to your machine
- Your `environments.json` file stays clean for git commits
- Team members share the initial values in version control and manage their own current values locally

See [Pre-request Scripts](/features/pre-request-scripts) for the full scripting API.

## Where Variables Are Substituted

The backend replaces <code v-pre>{{variable}}</code> placeholders in:

- Request URL
- Header values
- Request body

Substitution is a single pass - variables cannot reference other variables (no nesting).

Variable names are **case-sensitive**: <code v-pre>{{api_key}}</code> and <code v-pre>{{API_KEY}}</code> are different variables.
