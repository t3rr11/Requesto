# Request History

Track and replay all your API requests with full request/response logging.

## What is Request History?

Request History automatically logs every request you send, including:
- Request URL, method, headers, and body
- Response status, headers, and body
- Timestamp and duration
- Environment variables used

## Viewing History

Access history from the **Console** panel:

1. Click **Console** button in header (or press `Ctrl/Cmd + ~`)
2. View list of all requests
3. Click a request to see full details

## Request Details

Each history entry shows:

### Request Information
- **Method & URL**: `GET https://api.example.com/users`
- **Timestamp**: When the request was sent
- **Duration**: How long it took (e.g., 234ms)
- **Status Code**: HTTP response code (200, 404, 500, etc.)

### Full Request
- URL with substituted variables
- Headers sent
- Request body
- Authentication used

### Full Response
- Status code and text
- Response headers
- Response body (formatted JSON, XML, or raw)
- Response time

## Searching History

Use the search box in Console panel:

- Search by URL: `api.github.com`
- Search by method: `POST`
- Search by status: `404`
- Search by date: `2026-02-06`

## Filtering History

Filter by:
- **Method**: GET, POST, PUT, DELETE, etc.
- **Status**: Success (2xx), Redirect (3xx), Client Error (4xx), Server Error (5xx)
- **Date Range**: Today, Last 7 days, Custom range

## Replaying Requests

Re-send a previous request:

1. Find request in history
2. Click **Replay** button
3. Request opens in new tab with all original parameters
4. Modify if needed and send

Useful for:
- Debugging issues
- Testing with previous parameters
- Comparing responses over time

## Exporting History

### Export All History

1. Console panel → **Export** button
2. Save as JSON file

### Export Single Request

1. Click on request in history
2. **Export** button → Save details

Format:
```json
{
  "timestamp": "2026-02-06T10:30:00.000Z",
  "request": {
    "method": "GET",
    "url": "https://api.example.com/users/123",
    "headers": {...},
    "body": null
  },
  "response": {
    "status": 200,
    "statusText": "OK",
    "headers": {...},
    "body": {...},
    "duration": 234
  }
}
```

## Clearing History

### Clear All

1. Console panel → **Clear All** button
2. Confirm deletion

### Clear by Date

1. Filter by date range
2. **Clear Selected** button

### Selective Deletion

1. Select requests (Shift+Click for range)
2. **Delete Selected** button

## Automatic Cleanup

Configure automatic history cleanup:

1. Settings → History
2. Set retention period:
   - 7 days
   - 30 days
   - 90 days
   - Forever (manual cleanup only)

## Storage

History is stored in:
- **Desktop**: `data/history.json`
- **Docker**: `/app/data/history.json`

### Storage Limits

History automatically limits to:
- **Default**: Last 1000 requests
- **Configurable**: Up to 10,000 requests

Oldest entries are automatically removed when limit reached.

## Use Cases

### Debugging API Issues

1. Send request that fails
2. Check history for exact request sent
3. Verify variables were substituted correctly
4. Check headers and body
5. Compare with successful requests

### Performance Monitoring

Track response times:
1. Filter by endpoint
2. View duration for each request
3. Identify slow endpoints
4. Compare performance across environments

### Regression Testing

Compare responses over time:
1. Send request today
2. Find historical request for same endpoint
3. Compare responses
4. Identify API changes

### Team Collaboration

Export history to share with team:
1. Reproduce issue
2. Export request/response
3. Share JSON file
4. Team member imports and replays

## Console Logs

Console also shows:
- Error messages
- Variable substitution details
- OAuth token refresh events
- Network errors

### Log Levels

- **Info**: General information (blue)
- **Warning**: Non-critical issues (yellow)
- **Error**: Request failures (red)
- **Debug**: Detailed debugging info (gray)

## Best Practices

### 1. Regular Cleanup

Don't let history grow indefinitely:
- Set automatic cleanup to 30 days
- Or manually clear old entries monthly

### 2. Export Important Requests

Before clearing history:
- Export requests you might need later
- Save to project documentation
- Store in version control

### 3. Use for Documentation

Export successful requests as API examples:
```bash
# Example: Get User
GET https://api.example.com/users/123
Authorization: Bearer token
→ 200 OK (234ms)
```

### 4. Monitor Error Rates

Check console regularly:
- Look for patterns in failures
- Track 4xx (client errors) vs 5xx (server errors)
- Identify flaky endpoints

### 5. Compare Environments

Send same request to dev/staging/prod:
1. Switch environments
2. Send request each time
3. Compare responses in history
4. Verify consistency

## Privacy & Security

### What's Logged

- Full request and response (including sensitive data if present)
- Environment variables used (values, not names only)
- OAuth tokens (if used in request)

### What's NOT Logged

- Passwords typed in OAuth forms
- Data outside of HTTP requests
- Browser history or activity

### Recommendations

- **Don't share history with sensitive data**
- **Clear history before screenshots**
- **Use session storage for sensitive environments**
- **Export selectively when sharing**

## Troubleshooting

### History Not Appearing

**Cause**: Console panel hidden

**Solution**: Press `Ctrl/Cmd + ~` or click Console button in header

### History Too Large

**Symptom**: App becomes slow

**Solution**:
1. Clear old history
2. Reduce retention period
3. Lower request limit in settings

### Can't Find Request

**Solutions**:
- Use search box
- Check date filters
- Sort by timestamp (newest first)
- Verify request actually sent (check for errors)

### Export Fails

**Causes**:
- History too large
- Disk space full

**Solutions**:
- Export in smaller chunks (filter by date)
- Free up disk space
- Export as compressed format

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Toggle Console | `Ctrl+~` / `Cmd+~` |
| Search History | `Ctrl+F` / `Cmd+F` |
| Replay Request | `Enter` (when selected) |
| Delete Request | `Delete` |

## Tips & Tricks

### 1. Quick Replay

Double-click any history entry to replay immediately.

### 2. Copy cURL Command

Right-click history entry → **Copy as cURL**:
```bash
curl -X GET "https://api.example.com/users/123" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json"
```

### 3. Compare Responses

Open two history entries side-by-side:
- Shift+Click two requests
- Click **Compare** button
- See diff view

### 4. Favorite Requests

Star frequently accessed history entries:
- Click star icon on request
- Filter by favorites in history

### 5. Create Collection from History

Select multiple requests → **Save to Collection**:
- Automatically creates collection
- Saves all selected requests
- Preserves names and structure
