---
title: Calling & Debugging
description: Call your Requesto mock server from Requesto requests or your own app, inspect traffic in the request log, and troubleshoot 404 and 405 responses.
---

# Calling & Debugging

Once an endpoint exists, anything that can make an HTTP request can use it.

## From Requesto

Create a request as usual and use the mock server URL, for example `http://localhost:4748/api/users`.

To avoid repeating the base URL, add it to an [environment](/features/environments) as a variable such as `mockUrl`, then use <code v-pre>{{mockUrl}}</code>/api/users in your requests. Switch the variable to a real API later and the same requests keep working.

## From Your App

Set your app's API base URL to `http://localhost:4748`. The mock server allows any origin, so a frontend running on another port can call it directly from the browser.

## Request Log

The panel at the bottom of the Mock Server view logs every request the mock server receives. Each entry shows the method, path, status code, and how long the response took. Click an entry to expand it and see the response headers and body.

<ThemeImage src="/mock-server/request-log.png" alt="Request log with an expanded entry showing response headers and body" />

Requests that match no endpoint are logged too, with a `404` status. Combined with the endpoint list, this makes it easy to spot a typo in a path.

The log keeps the last 100 requests in memory and is cleared when Requesto restarts. Click the trash icon in the panel header to clear it sooner.

## Troubleshooting

**The base URL is missing from the URL bar.** The mock server could not start, usually because port `4748` is already in use. Set `MOCK_PORT` to a free port and restart Requesto.

**I get a 404.** Check that the endpoint is enabled, that the path matches exactly, and that you are calling the mock server port rather than the Requesto UI port. The request log shows what the mock server received.

**I get a 405.** The path matched, but that method has no response. Add the method to a [static endpoint](/mock-server/static#methods), or use an id on the route for dynamic PUT, PATCH, and DELETE.

**My dynamic data changed or disappeared.** Requests that create, update, or delete records change the saved dataset. **Clear Data** removes every record, and **Refresh** discards unsaved edits in the data pane. Remember to click **Save** after editing records.

## Related Features

- [Environments](/features/environments): store the mock base URL as a variable
- [Collections & Folders](/features/collections): save requests that call your mock endpoints
- [Git Integration](/features/git): share mock endpoints with your team
