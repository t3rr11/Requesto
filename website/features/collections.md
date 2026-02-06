# Collections & Folders

Organize your API requests with collections and folders.

## What are Collections?

Collections are groups of related API requests. Think of them as projects or API domains:

- **GitHub API** collection
- **Payment Gateway** collection
- **Internal Services** collection

## Creating Collections

### From Sidebar

1. Click **New Collection** in the sidebar
2. Enter a name and description
3. Click **Create**

### When Saving a Request

1. Click **Save** after sending a request
2. Choose **Create New Collection**
3. Enter collection name

## Folders

Folders help organize requests within collections:

```
E-commerce API
  Products
    List Products
    Get Product
    Create Product
  Orders
    List Orders
    Create Order
  Customers
    Get Customer
```

### Creating Folders

1. Right-click on a collection
2. Select **New Folder**
3. Enter folder name

## Organizing Requests

### Drag and Drop

- Drag requests between folders
- Drag folders within collections
- Reorder items

### Context Menu (Right-Click)

Available actions:
- **Rename** - Change name of collection/folder/request
- **Duplicate** - Create a copy
- **Delete** - Remove item
- **New Folder** - Add folder to collection
- **New Request** - Add request to folder

## Importing & Exporting

### Export Collection

1. Right-click collection
2. Select **Export**
3. Save as JSON file

Format:
```json
{
  "name": "My API",
  "description": "API collection",
  "folders": [...],
  "requests": [...]
}
```

### Import Collection

1. Click **Import** in sidebar
2. Select JSON file
3. Collection appears in sidebar

### Share with Team

Export collections to share via:
- Git repository
- File sharing
- Email attachment

## Saved Requests

When you save a request, it includes:

- URL with environment variables
- HTTP method
- Headers
- Query parameters
- Request body
- Authentication config

### Opening Saved Requests

- **Click** in sidebar to open in current tab
- **Middle-click** or **Ctrl+Click** to open in new tab

### Editing Saved Requests

1. Open the request
2. Make changes
3. Click **Save** to update

## Environment Variables in Collections

Use variables for flexibility:

```
URL: {{base_url}}/api/users/{{user_id}}
Headers:
  Authorization: Bearer {{api_token}}
```

Switch environments to test against different servers:
- Development: `base_url = http://localhost:3000`
- Staging: `base_url = https://staging.api.example.com`
- Production: `base_url = https://api.example.com`

## Collection Templates

Common collection structures:

### REST API CRUD

```
User Service
  List Users (GET)
  Get User (GET)
  Create User (POST)
  Update User (PUT)
  Delete User (DELETE)
```

### OAuth Flow

```
OAuth Authentication
  Get Auth URL
  Exchange Code for Token
  Refresh Token
  Authenticated Request
```

### Microservices

```
Platform Services
  Auth Service
  User Service
  Payment Service
  Notification Service
```

## Search & Filter

Use the search box in sidebar:
- Search by request name
- Search by URL
- Search by method (GET, POST, etc.)

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New Request | `Ctrl+N` / `Cmd+N` |
| Save Request | `Ctrl+S` / `Cmd+S` |
| Toggle Sidebar | `Ctrl+B` / `Cmd+B` |
| Focus Search | `Ctrl+F` / `Cmd+F` |

## Best Practices

### Naming Conventions

- **Collections**: Descriptive, e.g., "GitHub API v3"
- **Folders**: Group by resource, e.g., "Users", "Repositories"
- **Requests**: Action + resource, e.g., "Create User", "Get Repo"

### Organization Strategies

**By Resource**:
```
API
  Users
  Products
  Orders
```

**By Feature**:
```
API
  Authentication
  Shopping Cart
  Checkout
```

**By Environment** (not recommended - use Environment Variables instead):
```
Don't do this
Dev API
Staging API
Prod API

Do this instead
API (use environment selector)
```

### Documentation

Add descriptions to collections and folders:
- API base URL
- Authentication requirements
- Common headers
- Version information

## Version Control

Store collections in Git:

```bash
# Export all collections
# Save to project repository
git add collections/
git commit -m "Update API collections"
```

Share with team:
```bash
git pull  # Get latest collections
# Import into Requesto
```

## Tips & Tricks

1. **Color Coding**: Use prefixes for visual grouping:
   - `[Auth]` for authentication endpoints
   - `[Admin]` for admin-only endpoints
   - `[Public]` for public APIs

2. **Bulk Operations**: Select multiple requests (Shift+Click) for batch operations

3. **Quick Access**: Pin frequently used requests to the top

4. **Documentation Links**: Include API documentation URLs in collection descriptions

5. **Pre-request Scripts**: Document prerequisites in request descriptions
