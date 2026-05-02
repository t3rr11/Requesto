---
title: Collection Runner
description: Run all requests in a collection or folder sequentially in Requesto. View pass/fail test results, response details, and environment variable changes across the entire run.
---

# Collection Runner

Run all requests in a collection or folder in sequence. The runner executes each request one at a time, applies pre-request scripts, runs test assertions, and reports the result for every request in a single view.

## Opening the Runner

Right-click any collection in the sidebar and choose **Run Collection**. To run only a subset of requests, right-click a folder and choose **Run Folder**.

<ThemeImage src="/collection-runner/dialog.png" alt="Collection runner dialog" />

## The Runner Dialog

The dialog shows all requests grouped by their folder structure. The toolbar at the top has three controls:

- **Run** - starts executing requests from the beginning
- **Stop** - cancels the run after the current request finishes
- **Reset** - clears all results and resets every request to pending

A summary count at the top right shows how many requests passed, failed, or errored during the run.

## Request Status

Each request row shows one of the following statuses:

| Status | Meaning |
|--------|---------|
| Pending | Not yet run |
| Running | Currently executing |
| Passed | All tests passed (or no tests defined) |
| Failed | One or more tests failed |
| Error | The request itself failed (network error, timeout, etc.) |
| Skipped | The run was stopped before this request was reached |

## Expanding Request Results

Click a request row to expand it and see the response details. Expanded rows have two tabs:

- **Response** - status code, headers, body, and duration
- **Tests** - individual test names and pass/fail status

Rows with test results expand automatically when the run completes.

## Scripts and Environment Chaining

Pre-request scripts and test scripts run for every request in the runner, just as they would when sending a request manually.

Environment changes made by one script carry forward to subsequent requests in the same run. If a pre-request script calls `environment.set('token', value)`, that value is available to the next request's URL, headers, and scripts without any manual intervention.

This lets you chain requests: authenticate, capture a token, then use it in follow-up calls.

## Folder Groups

Requests are displayed under their folder headers. Click a folder header to collapse or expand that group. Collapsing a folder group only hides the display - the requests still run when you click **Run**.

## Related Features

- [Pre-request Scripts](/features/pre-request-scripts) - run JavaScript before each request
- [Tests](/features/tests) - write assertions that validate each response
