# Requesto Development Guide

## Project Architecture

**Three-app monorepo**: This is an npm workspace with three independent apps:
- `apps/frontend` - React/Vite/TailwindCSS web UI
- `apps/backend` - Fastify Node.js proxy server  
- `apps/electron` - Electron desktop wrapper

**Data flow**: Frontend → Backend proxy → External APIs. The backend proxy eliminates CORS issues and handles environment variable substitution server-side.

**State management**: Zustand stores in `apps/frontend/src/store/` - each feature has its own store (collections, environments, OAuth, requests, tabs, UI, theme, alert). Each store is organized in its own directory with:
- `store.ts` - State interface definition and store creation
- `actions.ts` - All action implementations with integrated API fetch logic
- `index.ts` - Re-exports for clean imports

**Store structure pattern**:
```
apps/frontend/src/store/
  ├── collections/
  │   ├── store.ts       (state interface + createStore)
  │   ├── actions.ts     (CRUD actions + API fetch logic)
  │   └── index.ts       (export useCollectionsStore)
  ├── environments/
  ├── oauth/
  ├── request/
  ├── tabs/
  ├── ui/
  ├── theme/
  └── alert/
```

**API communication architecture (CRITICAL)**: 
- **ALL API calls MUST go through state store actions** - Components/forms never import API helpers directly
- Data flow: `Component → Store Hook → Store Action (with integrated fetch) → Backend → Store State Update → Component Re-render`
- **API fetch logic lives in store actions** - No separate API helper layer for CRUD operations
- Only exception: Rare cases where a full state store doesn't make sense for a one-off action
- Frontend detects Electron vs browser via `apps/frontend/src/helpers/api/config.ts`
- Electron uses `http://localhost:4000/api`, browser uses Vite proxy `/api`
- Store actions handle loading states, error handling, and state updates automatically
- Remaining helpers: `config.ts` (API_BASE constant), `authRequest.ts` (shared OAuth utilities)

## Key Development Workflows

**Local development**:
```bash
npm run dev              # Run backend + frontend (ports 4000 & 5173)
npm run dev:electron     # Run all three with Electron window
```

**Building**:
```bash
npm run build                    # Build all apps
npm run package:electron:win     # Create Windows installer
```

**Docker**: Multi-stage build in `Dockerfile` - backend/frontend build separately, combined in production image. Data persists in `/app/data` volume mount.

## Storage & Data Model

**File-based JSON storage** at `apps/backend/data/`:
- `collections.json` - Nested structure: Collection → Folders → SavedRequests
- `environments.json` - Variables with active environment tracking
- `history.json` - Request/response logs
- `oauth-configs.json` - OAuth 2.0 configurations (client secrets server-side only)

**Atomic writes**: All storage uses temp file + rename pattern (see `apps/backend/src/database/storage.ts`)

**Collections hierarchy**: `Collection.folders[]` and `Collection.requests[]` arrays. Requests have optional `folderId` for nesting. Drag-drop uses `@dnd-kit` with order tracking.

## Critical Conventions

**Types location**: Shared types in `apps/frontend/src/types/index.ts` and `apps/backend/src/types/index.ts`. Some duplication exists - keep request/response contracts synchronized.

**Environment variables**: Backend substitutes `{{variableName}}` in URLs/headers/body before proxying. See `apps/backend/src/database/environments.ts` `substituteInRequest()`.

**Authentication flow**: 
1. Frontend stores auth config in request
2. Backend's `applyAuthentication()` in `apps/backend/src/helpers/authHelpers.ts` applies to proxied request
3. OAuth tokens stored client-side, configs server-side

**Routing**: React Router with HashRouter for Electron compatibility. Routes: `/requests`, `/environments`, `/oauth`, `/oauth/callback`.

**Monaco Editor**: Used for JSON body editing. Configured with JSON schema validation.

## OAuth 2.0 Implementation

**Config storage split**: `OAuthConfig` server-side (includes clientSecret), `OAuthTokens` client-side only (sessionStorage/localStorage based on user preference).

**Flow types supported**: authorization-code, authorization-code-pkce, implicit, client-credentials, password. PKCE auto-enabled for `authorization-code-pkce`.

**Token refresh**: Automatic via `useTokenRefresh` hook when `autoRefreshToken: true`. Threshold configurable per config.

## Testing & Debugging

**SSE endpoint**: Built-in test endpoint at `/api/sse-test/stream` for Server-Sent Events testing.

**Console logs**: All requests logged to `useRequestStore.consoleLogs` with full request/response data. View in ConsolePanel component.

**Electron DevTools**: Auto-open in dev mode. Backend runs as child process on port 4000.

## Common Patterns

**API request flow (REQUIRED PATTERN)**:
```typescript
// ✅ CORRECT - Component uses store action (which has integrated fetch logic)
import { useCollectionsStore } from '../store/collections';

const MyForm = () => {
  const { createCollection } = useCollectionsStore();
  
  const handleSubmit = async () => {
    await createCollection({ name, description }); // Store action handles fetch + state update
  };
};

// ❌ WRONG - Don't import from old API helpers (they no longer exist)
import { collectionsApi } from '../helpers/api/collections'; // File doesn't exist!

// ❌ WRONG - Don't make raw fetch calls in components
const MyForm = () => {
  const handleSubmit = async () => {
    const res = await fetch('/api/collections', { ... }); // Bypasses state management
  };
};
```

**Store action patteStore actions throw errors after logging with `console.error()`, components/forms catch and display
```typescript
// In store/collections/actions.ts
import { API_BASE } from '../../helpers/api/config';
import type { CollectionsState } from './store';

// Internal API helper (not exported)
async function createCollectionApi(data: { name: string; description?: string }) {
  const res = await fetch(`${API_BASE}/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create collection');
  return res.json();
}

// Exported store action
export const createCollection = (set: SetState<CollectionsState>) => 
  async (data: { name: string; description?: string }) => {
    try {
      await createCollectionApi(data);
      await loadCollections(set); // Refresh state after mutation
    } catch (error) {
      console.error('Error creating collection:', error);
      throw error; // Let component handle UI feedback
    }
  };
```

**Dialogs**: Centralized via `DialogManager` component + `useDialogManager` hook. Register dialogs once, control via store actions.

**Variable-aware inputs**: Use `VariableAwareInput` component for fields supporting `{{env}}` substitution. Shows autocomplete from active environment.

**Error handling**: API helpers throw errors, caught by try/catch in store actions, displayed via `useAlertStore`.

**Tab management**: Each request opens in new tab via `useTabsStore`. Tabs track unsaved changes with dirty flag.

## External Dependencies

**No database**: All persistence is JSON files. No migrations, schema is implicit in TypeScript types.

**Proxy library**: Backend uses axios for standard requests, node-fetch for SSE streams.

**Styling**: TailwindCSS with dark mode via class strategy. Theme toggled by `useThemeStore` setting `<html class="dark">`.

## Production Deployment

**Docker**: Single container, frontend served as static files by backend in production. `NODE_ENV=production` triggers static file serving.

**Data persistence**: Mount volume at `/app/data` or set `DATA_DIR` env var. 

**Electron**: Packaged apps include embedded backend (Node.js child process) + frontend static files. User data in platform-specific AppData directories.
