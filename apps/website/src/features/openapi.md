# OpenAPI Import & Sync

Import OpenAPI v2 (Swagger) or v3 specs to generate collections automatically. Optionally link a spec to a collection so you can sync changes as the API evolves.

## Importing a Spec

Click the **Import** button in the sidebar header and select **OpenAPI Spec**.

<ThemeImage src="/openapi/import-dialog.png" alt="OpenAPI import dialog" />

Enter the source - either a file path or a URL pointing to a JSON or YAML spec. Give the collection a name, then click **Import**.

Requesto parses the spec, resolves all `$ref` pointers, and generates:

- A **collection** with folders grouped by tags (or paths, if no tags are defined)
- A **request** for each operation, with the method, URL template, and headers from the spec
- An **environment** with the base URL(s) extracted from the spec's `servers` (v3) or `host` (v2) field

<ThemeImage src="/openapi/imported-collection.png" alt="Imported collection in sidebar" />

Request URLs use <code v-pre>{{baseUrl}}</code> so you can switch between servers by changing the environment variable.

## Linking a Spec

When importing, you can choose to **link** the spec to the collection. A linked spec stores the source URL and a hash of the spec content, which lets Requesto detect when the spec has changed.

If you don't link the spec, the import is a one-time operation and subsequent changes to the spec are not tracked.

## Syncing Changes

For linked collections, right-click the collection in the sidebar and choose **Sync from Spec**. Requesto fetches the latest spec, compares it against the stored hash, and shows a preview of what changed.

<ThemeImage src="/openapi/sync-preview.png" alt="Sync preview dialog" />

The preview shows:

- **New** operations that will be added as requests
- **Updated** operations where the method, URL, or parameters changed
- **Orphaned** requests that no longer match any operation in the spec

Review the changes and click **Apply Changes** to update the collection.

## Unlinking a Spec

Right-click a linked collection and choose **Unlink Spec** to remove the spec metadata. The collection keeps all its requests and folders, but sync is no longer available. The **Sync from Spec** option disappears from the context menu.

## Supported Spec Versions

| Version | Support |
|---------|---------|
| OpenAPI 3.x | Full |
| Swagger 2.0 | Full (converted to v3 internally) |

Both JSON and YAML formats are accepted. Remote `$ref` pointers are resolved during import.

## What Gets Generated

| Spec Element | Requesto Element |
|-------------|-----------------|
| Tag | Folder |
| Operation | Request |
| `servers[].url` or `host` | Environment variable (`baseUrl`) |
| Path parameters | URL placeholders (<code v-pre>{{paramName}}</code>) |
| `operationId` | Used for linking during sync |

Operations without tags are placed at the collection root.
