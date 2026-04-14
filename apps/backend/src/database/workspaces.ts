import fs from 'fs';
import path from 'path';
import { Workspace, WorkspacesRegistry } from '../types';
import { atomicWrite } from '../helpers/fileUtils';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const WORKSPACES_DIR = path.join(DATA_DIR, 'workspaces');
const WORKSPACES_FILE = path.join(DATA_DIR, 'workspaces.json');

const DATA_FILES = ['collections.json', 'environments.json', 'oauth-configs.json'];
const LOCAL_DATA_FILES = ['history.json'];

function generateId(): string {
  return `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getRegistry(): WorkspacesRegistry {
  try {
    const data = fs.readFileSync(WORKSPACES_FILE, 'utf-8');
    return JSON.parse(data) as WorkspacesRegistry;
  } catch {
    return { activeWorkspaceId: '', workspaces: [] };
  }
}

export function saveRegistry(registry: WorkspacesRegistry): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  atomicWrite(WORKSPACES_FILE, registry);
}

export function getActiveWorkspace(): Workspace {
  const registry = getRegistry();
  const workspace = registry.workspaces.find(w => w.id === registry.activeWorkspaceId);
  if (!workspace) {
    throw new Error('No active workspace found. Workspace registry may be corrupted.');
  }
  return workspace;
}

export function getWorkspaceById(id: string): Workspace | null {
  const registry = getRegistry();
  return registry.workspaces.find(w => w.id === id) || null;
}

export function getWorkspaceDataDir(): string {
  const workspace = getActiveWorkspace();
  return workspace.path;
}

export function getWorkspaceLocalDir(): string {
  const workspace = getActiveWorkspace();
  return path.join(workspace.path, '.requesto');
}

function ensureWorkspaceDirs(workspacePath: string): void {
  if (!fs.existsSync(workspacePath)) {
    fs.mkdirSync(workspacePath, { recursive: true });
  }
  const localDir = path.join(workspacePath, '.requesto');
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
}

function initializeWorkspaceFiles(workspacePath: string): void {
  ensureWorkspaceDirs(workspacePath);

  const defaults: Record<string, unknown> = {
    'collections.json': [],
    'environments.json': {
      activeEnvironmentId: null,
      environments: [],
    },
    'oauth-configs.json': { configs: [] },
  };

  for (const [file, defaultData] of Object.entries(defaults)) {
    const filePath = path.join(workspacePath, file);
    if (!fs.existsSync(filePath)) {
      atomicWrite(filePath, defaultData);
    }
  }

  const localDir = path.join(workspacePath, '.requesto');
  const historyFile = path.join(localDir, 'history.json');
  if (!fs.existsSync(historyFile)) {
    atomicWrite(historyFile, []);
  }

  const secretsFile = path.join(localDir, 'oauth-secrets.json');
  if (!fs.existsSync(secretsFile)) {
    atomicWrite(secretsFile, { secrets: {} });
  }
}

export function getWorkspacesDir(): string {
  return WORKSPACES_DIR;
}

export function createWorkspace(name: string): Workspace {
  const id = generateId();
  const workspacePath = path.join(WORKSPACES_DIR, id);

  const registry = getRegistry();

  const workspace: Workspace = {
    id,
    name,
    path: workspacePath,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  initializeWorkspaceFiles(workspacePath);

  registry.workspaces.push(workspace);
  if (!registry.activeWorkspaceId) {
    registry.activeWorkspaceId = workspace.id;
  }
  saveRegistry(registry);

  return workspace;
}

export function createWorkspaceAtPath(name: string, workspacePath: string): Workspace {
  const resolvedPath = path.resolve(workspacePath);

  const registry = getRegistry();
  const duplicate = registry.workspaces.find(w => w.path === resolvedPath);
  if (duplicate) {
    throw new Error(`A workspace already exists at this path: ${duplicate.name}`);
  }

  const workspace: Workspace = {
    id: generateId(),
    name,
    path: resolvedPath,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  initializeWorkspaceFiles(resolvedPath);

  registry.workspaces.push(workspace);
  if (!registry.activeWorkspaceId) {
    registry.activeWorkspaceId = workspace.id;
  }
  saveRegistry(registry);

  return workspace;
}

export function exportWorkspaceData(id: string): Record<string, unknown> {
  const workspace = getWorkspaceById(id);
  if (!workspace) throw new Error('Workspace not found');

  const data: Record<string, unknown> = { name: workspace.name };

  for (const file of DATA_FILES) {
    const filePath = path.join(workspace.path, file);
    if (fs.existsSync(filePath)) {
      try {
        data[file] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch {
        data[file] = null;
      }
    }
  }

  return data;
}

export function importWorkspaceData(bundle: Record<string, unknown>): Workspace {
  const name = typeof bundle.name === 'string' ? bundle.name : 'Imported Workspace';
  const workspace = createWorkspace(name);

  for (const file of DATA_FILES) {
    if (bundle[file] != null) {
      const filePath = path.join(workspace.path, file);
      atomicWrite(filePath, bundle[file]);
    }
  }

  return workspace;
}

export function openWorkspace(name: string, workspacePath: string): Workspace {
  const resolvedPath = path.resolve(workspacePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Directory does not exist: ${resolvedPath}`);
  }

  const registry = getRegistry();
  const existing = registry.workspaces.find(w => w.path === resolvedPath);
  if (existing) {
    return existing;
  }

  const workspace: Workspace = {
    id: generateId(),
    name,
    path: resolvedPath,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Ensure .requesto directory exists for local data
  ensureWorkspaceDirs(resolvedPath);

  const localDir = path.join(resolvedPath, '.requesto');
  const historyFile = path.join(localDir, 'history.json');
  if (!fs.existsSync(historyFile)) {
    atomicWrite(historyFile, []);
  }
  const secretsFile = path.join(localDir, 'oauth-secrets.json');
  if (!fs.existsSync(secretsFile)) {
    atomicWrite(secretsFile, { secrets: {} });
  }

  registry.workspaces.push(workspace);
  if (!registry.activeWorkspaceId) {
    registry.activeWorkspaceId = workspace.id;
  }
  saveRegistry(registry);

  return workspace;
}

export function updateWorkspace(id: string, updates: { name?: string }): Workspace | null {
  const registry = getRegistry();
  const index = registry.workspaces.findIndex(w => w.id === id);
  if (index === -1) return null;

  registry.workspaces[index] = {
    ...registry.workspaces[index],
    ...updates,
    updatedAt: Date.now(),
  };
  saveRegistry(registry);
  return registry.workspaces[index];
}

export function deleteWorkspace(id: string): boolean {
  const registry = getRegistry();
  const index = registry.workspaces.findIndex(w => w.id === id);
  if (index === -1) return false;

  if (registry.workspaces.length === 1) {
    throw new Error('Cannot delete the last workspace');
  }

  registry.workspaces.splice(index, 1);

  if (registry.activeWorkspaceId === id) {
    registry.activeWorkspaceId = registry.workspaces[0].id;
  }

  saveRegistry(registry);
  return true;
}

export function setActiveWorkspace(id: string): Workspace {
  const registry = getRegistry();
  const workspace = registry.workspaces.find(w => w.id === id);
  if (!workspace) {
    throw new Error(`Workspace not found: ${id}`);
  }

  if (!fs.existsSync(workspace.path)) {
    throw new Error(`Workspace directory no longer exists: ${workspace.path}`);
  }

  registry.activeWorkspaceId = id;
  saveRegistry(registry);
  return workspace;
}

/**
 * Bootstrap workspace system on server startup.
 * 
 * If workspaces.json exists, validate and use it.
 * If not, detect existing data files and migrate them into a Default workspace,
 * or create an empty Default workspace if DATA_DIR is empty.
 */
export function bootstrapWorkspaces(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(WORKSPACES_FILE)) {
    const registry = getRegistry();
    if (registry.workspaces.length > 0) {
      // Validate active workspace still exists on disk
      const active = registry.workspaces.find(w => w.id === registry.activeWorkspaceId);
      if (active && !fs.existsSync(active.path)) {
        console.warn(`Active workspace directory missing: ${active.path}. Switching to first available.`);
        const valid = registry.workspaces.find(w => fs.existsSync(w.path));
        if (valid) {
          registry.activeWorkspaceId = valid.id;
          saveRegistry(registry);
        }
      }
      return;
    }
  }

  // Check if existing data files live directly in DATA_DIR (pre-workspace layout)
  const hasExistingData = DATA_FILES.some(f => fs.existsSync(path.join(DATA_DIR, f)));

  const defaultPath = path.join(DATA_DIR, 'Default');

  if (hasExistingData) {
    console.log('Migrating existing data into Default workspace...');

    ensureWorkspaceDirs(defaultPath);

    // Move data files into Default workspace
    for (const file of DATA_FILES) {
      const src = path.join(DATA_DIR, file);
      const dest = path.join(defaultPath, file);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
        fs.unlinkSync(src);
      }
    }

    // Move history into .requesto/ local dir
    const localDir = path.join(defaultPath, '.requesto');
    for (const file of LOCAL_DATA_FILES) {
      const src = path.join(DATA_DIR, file);
      const dest = path.join(localDir, file);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
        fs.unlinkSync(src);
      }
    }

    // Split OAuth secrets: extract clientSecret from oauth-configs.json into oauth-secrets.json
    const oauthConfigPath = path.join(defaultPath, 'oauth-configs.json');
    if (fs.existsSync(oauthConfigPath)) {
      try {
        const oauthData = JSON.parse(fs.readFileSync(oauthConfigPath, 'utf-8'));
        const secrets: Record<string, string> = {};

        if (oauthData.configs && Array.isArray(oauthData.configs)) {
          oauthData.configs = oauthData.configs.map((config: { id: string; clientSecret?: string }) => {
            if (config.clientSecret) {
              secrets[config.id] = config.clientSecret;
              const { clientSecret, ...rest } = config;
              return rest;
            }
            return config;
          });
        }

        atomicWrite(oauthConfigPath, oauthData);
        atomicWrite(path.join(localDir, 'oauth-secrets.json'), { secrets });
      } catch (error) {
        console.error('Error splitting OAuth secrets during migration:', error);
      }
    }

    // Ensure history file exists in local dir
    const historyFile = path.join(localDir, 'history.json');
    if (!fs.existsSync(historyFile)) {
      atomicWrite(historyFile, []);
    }

    console.log('Migration complete.');
  } else {
    // Fresh install — create empty Default workspace
    ensureWorkspaceDirs(defaultPath);
    initializeWorkspaceFiles(defaultPath);
  }

  const workspace: Workspace = {
    id: generateId(),
    name: 'Local Workspace',
    path: defaultPath,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const registry: WorkspacesRegistry = {
    activeWorkspaceId: workspace.id,
    workspaces: [workspace],
  };

  saveRegistry(registry);
  console.log(`Workspace system initialized. Active workspace: "${workspace.name}" at ${workspace.path}`);
}
