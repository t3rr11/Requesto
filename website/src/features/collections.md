# Collections & Folders

Organize API requests into collections and folders.

## Collections

A collection is a group of related requests. Click the **New Collection** button (folder-plus icon) in the sidebar header to create one - give it a name and optional description.

Each collection can contain requests at the top level and folders for further grouping:

```
E-commerce API
├── List Products (GET)
├── Products/
│   ├── Get Product (GET)
│   └── Create Product (POST)
└── Orders/
    ├── List Orders (GET)
    └── Create Order (POST)
```

## Folders

Hover over a collection in the sidebar to reveal two icon buttons:

- **+** - Add a new request to the collection
- **Folder+** - Create a new folder inside the collection

Type the folder name inline and press Enter.

## Drag and Drop

Reorder requests and folders within a collection by dragging them. You can move requests between folders or back to the collection root.

## Context Menu

Right-click any collection, folder, or request in the sidebar. The menu has three actions:

- **Rename**
- **Export** - downloads the item as a JSON file
- **Delete**

## Import & Export

**Import**: Click the upload icon in the sidebar header and select a JSON file. The collection is added to the sidebar.

**Export**: Right-click a collection, folder, or request and choose **Export**. The exported JSON includes all nested folders and requests.

## Saved Requests

A saved request stores:

- URL (can include environment variables)
- HTTP method
- Headers, query parameters, body
- Authentication configuration

Click a saved request in the sidebar to open it. Edit it and click **Save** to save changes.

## Search

The search box at the top of the sidebar filters collections, folders, and requests by name or URL as you type.
