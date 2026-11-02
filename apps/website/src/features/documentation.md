---
title: Request Documentation
description: Attach markdown documentation to every saved request in Requesto with the Docs tab, keeping it readable and diffable in git.
---

# Request Documentation

Every saved request has a **Docs** tab. Use it to record what the endpoint is for, how to authenticate, which environment variables it expects, or anything else a teammate would want to know before running it.

## Where to Write Documentation

Open a saved request and click the **Docs** tab in the request form. The editor starts empty with a placeholder hint. Documentation is optional; a request without docs works the same as before.

## Writing Docs

The Docs tab is a rich text editor with a toolbar for:

- Headings (three levels)
- Bold, italic, and strikethrough
- Inline code and code blocks with syntax highlighting
- Bullet and numbered lists
- Quotes, horizontal rules, and links

You can also write markdown directly. Typing `**bold**` converts as you format, and markdown pasted into the editor is parsed as markdown.

- Select text and click the link button to open the link dialog, where you can set the link text and URL. With the cursor inside an existing link the same button becomes an edit link action, prefilled with the current text and URL
- Code blocks keep their language tag (e.g. ```` ```js ````) for syntax highlighting

## Stored as Markdown

Docs are saved as plain markdown in a `documentation` field on the request, alongside its scripts. Because collection files are versioned by git, documentation changes read like a normal markdown diff, and a doc stays readable in any text editor:

```json
// Inside .requesto/collections/<collection>.json
{
  "id": "req-api-health",
  "name": "Health Check",
  "documentation": "# Health Check\n\nReturns **200** when healthy.",
  ...
}
```

## Saving

Documentation is saved with the request when you click **Save**, the same as every other request field. Use it together with the request's script tabs and parameters, and add a description on the parent collection for context that applies to the whole group.
