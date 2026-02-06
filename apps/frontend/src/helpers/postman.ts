import { Collection, SavedRequest, Folder, AuthConfig, Environment, EnvironmentVariable } from '../types';

// Postman Collection v2.1.0 Types
interface PostmanCollection {
  info: {
    _postman_id?: string;
    name: string;
    description?: string;
    schema: string;
  };
  item: PostmanItem[];
  auth?: PostmanAuth;
  variable?: PostmanVariable[];
}

interface PostmanItem {
  name: string;
  request?: PostmanRequest;
  item?: PostmanItem[]; // Nested items (folders)
  description?: string;
}

interface PostmanRequest {
  method: string;
  header?: PostmanHeader[];
  body?: PostmanBody;
  url: PostmanUrl | string;
  auth?: PostmanAuth;
  description?: string;
}

interface PostmanHeader {
  key: string;
  value: string;
  type?: string;
  disabled?: boolean;
}

interface PostmanBody {
  mode: string;
  raw?: string;
  urlencoded?: Array<{ key: string; value: string; disabled?: boolean }>;
  formdata?: Array<{ key: string; value: string; type?: string; disabled?: boolean }>;
  options?: {
    raw?: {
      language?: string;
    };
  };
}

interface PostmanUrl {
  raw: string;
  protocol?: string;
  host?: string[];
  path?: string[];
  query?: PostmanQueryParam[];
  variable?: PostmanPathVariable[];
}

interface PostmanQueryParam {
  key: string;
  value: string;
  disabled?: boolean;
  type?: string;
}

interface PostmanPathVariable {
  key: string;
  value: string;
  description?: string;
}

interface PostmanAuth {
  type: string;
  basic?: Array<{ key: string; value: string }>;
  bearer?: Array<{ key: string; value: string }>;
  apikey?: Array<{ key: string; value: string }>;
  oauth2?: Array<{ key: string; value: string }>;
}

interface PostmanVariable {
  key: string;
  value: string;
  type?: string;
  disabled?: boolean;
}

// Postman Environment Types
interface PostmanEnvironment {
  id?: string;
  name: string;
  values: PostmanVariable[];
  _postman_variable_scope?: string;
}

/**
 * Convert Postman collection to Requesto collection
 */
export function importPostmanCollection(postmanData: PostmanCollection): Collection {
  const collectionId = crypto.randomUUID();
  const now = Date.now();

  const folders: Folder[] = [];
  const requests: SavedRequest[] = [];

  // Process items recursively
  processPostmanItems(postmanData.item, collectionId, folders, requests, undefined);

  return {
    id: collectionId,
    name: postmanData.info.name,
    description: postmanData.info.description,
    folders,
    requests,
    createdAt: now,
    updatedAt: now,
  };
}

function processPostmanItems(
  items: PostmanItem[],
  collectionId: string,
  folders: Folder[],
  requests: SavedRequest[],
  parentFolderId?: string
): void {
  const now = Date.now();

  items.forEach((item, index) => {
    if (item.request) {
      // It's a request
      const request = convertPostmanRequest(item, collectionId, parentFolderId, now);
      request.order = index;
      requests.push(request);
    } else if (item.item) {
      // It's a folder
      const folderId = crypto.randomUUID();
      folders.push({
        id: folderId,
        name: item.name,
        parentId: parentFolderId,
        collectionId,
        createdAt: now,
        updatedAt: now,
      });

      // Process nested items
      processPostmanItems(item.item, collectionId, folders, requests, folderId);
    }
  });
}

function convertPostmanRequest(
  item: PostmanItem,
  collectionId: string,
  folderId: string | undefined,
  timestamp: number
): SavedRequest {
  const request = item.request!;
  
  // Parse URL
  let url: string;
  let queryParams: Record<string, string> = {};
  
  if (typeof request.url === 'string') {
    url = request.url;
  } else {
    url = request.url.raw;
    
    // Extract query parameters
    if (request.url.query) {
      request.url.query.forEach(param => {
        if (!param.disabled) {
          queryParams[param.key] = param.value;
        }
      });
    }
  }

  // Parse headers
  const headers: Record<string, string> = {};
  if (request.header) {
    request.header.forEach(header => {
      if (!header.disabled) {
        headers[header.key] = header.value;
      }
    });
  }

  // Parse body
  let body: string | undefined;
  if (request.body) {
    if (request.body.mode === 'raw' && request.body.raw) {
      body = request.body.raw;
    } else if (request.body.mode === 'urlencoded' && request.body.urlencoded) {
      body = request.body.urlencoded
        .filter(item => !item.disabled)
        .map(item => `${encodeURIComponent(item.key)}=${encodeURIComponent(item.value)}`)
        .join('&');
    } else if (request.body.mode === 'formdata' && request.body.formdata) {
      // For formdata, we'll represent it as JSON for now
      const formObj: Record<string, string> = {};
      request.body.formdata.forEach(item => {
        if (!item.disabled) {
          formObj[item.key] = item.value;
        }
      });
      body = JSON.stringify(formObj, null, 2);
    }
  }

  // Convert auth
  const auth = convertPostmanAuth(request.auth);

  return {
    id: crypto.randomUUID(),
    name: item.name,
    method: request.method,
    url,
    headers,
    body,
    auth,
    collectionId,
    folderId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function convertPostmanAuth(postmanAuth?: PostmanAuth): AuthConfig | undefined {
  if (!postmanAuth) {
    return { type: 'none' };
  }

  const authConfig: AuthConfig = { type: 'none' };

  switch (postmanAuth.type) {
    case 'basic':
      if (postmanAuth.basic) {
        const username = postmanAuth.basic.find(item => item.key === 'username')?.value || '';
        const password = postmanAuth.basic.find(item => item.key === 'password')?.value || '';
        authConfig.type = 'basic';
        authConfig.basic = { username, password };
      }
      break;

    case 'bearer':
      if (postmanAuth.bearer) {
        const token = postmanAuth.bearer.find(item => item.key === 'token')?.value || '';
        authConfig.type = 'bearer';
        authConfig.bearer = { token };
      }
      break;

    case 'apikey':
      if (postmanAuth.apikey) {
        const key = postmanAuth.apikey.find(item => item.key === 'key')?.value || '';
        const value = postmanAuth.apikey.find(item => item.key === 'value')?.value || '';
        const addTo = (postmanAuth.apikey.find(item => item.key === 'in')?.value || 'header') as 'header' | 'query';
        authConfig.type = 'api-key';
        authConfig.apiKey = { key, value, addTo };
      }
      break;

    // Note: OAuth and Digest are more complex and may need additional handling
    default:
      authConfig.type = 'none';
  }

  return authConfig;
}

/**
 * Export Requesto collection to Postman format
 */
export function exportToPostman(collection: Collection): PostmanCollection {
  const items = buildPostmanItems(collection);

  return {
    info: {
      _postman_id: collection.id,
      name: collection.name,
      description: collection.description,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: items,
  };
}

function buildPostmanItems(collection: Collection): PostmanItem[] {
  const items: PostmanItem[] = [];
  const folderMap = new Map<string, PostmanItem>();

  // Create folder structure
  collection.folders.forEach(folder => {
    const folderItem: PostmanItem = {
      name: folder.name,
      item: [],
    };
    folderMap.set(folder.id, folderItem);
  });

  // Organize folders hierarchically
  collection.folders.forEach(folder => {
    const folderItem = folderMap.get(folder.id)!;
    if (folder.parentId) {
      const parentFolder = folderMap.get(folder.parentId);
      if (parentFolder) {
        parentFolder.item!.push(folderItem);
      }
    } else {
      items.push(folderItem);
    }
  });

  // Add requests to appropriate folders or root
  const sortedRequests = [...collection.requests].sort((a, b) => (a.order || 0) - (b.order || 0));
  
  sortedRequests.forEach(request => {
    const postmanItem = convertToPostmanRequest(request);
    
    if (request.folderId) {
      const folder = folderMap.get(request.folderId);
      if (folder) {
        folder.item!.push(postmanItem);
      } else {
        items.push(postmanItem);
      }
    } else {
      items.push(postmanItem);
    }
  });

  return items;
}

function convertToPostmanRequest(request: SavedRequest): PostmanItem {
  const postmanRequest: PostmanRequest = {
    method: request.method,
    header: [],
    url: request.url,
  };

  // Convert headers
  if (request.headers) {
    postmanRequest.header = Object.entries(request.headers).map(([key, value]) => ({
      key,
      value,
      type: 'text',
    }));
  }

  // Convert body
  if (request.body) {
    postmanRequest.body = {
      mode: 'raw',
      raw: request.body,
      options: {
        raw: {
          language: 'json',
        },
      },
    };
  }

  // Convert auth
  if (request.auth) {
    postmanRequest.auth = convertToPostmanAuth(request.auth);
  }

  return {
    name: request.name,
    request: postmanRequest,
  };
}

function convertToPostmanAuth(auth: AuthConfig): PostmanAuth | undefined {
  if (auth.type === 'none') {
    return undefined;
  }

  const postmanAuth: PostmanAuth = { type: auth.type };

  switch (auth.type) {
    case 'basic':
      if (auth.basic) {
        postmanAuth.type = 'basic';
        postmanAuth.basic = [
          { key: 'username', value: auth.basic.username },
          { key: 'password', value: auth.basic.password },
        ];
      }
      break;

    case 'bearer':
      if (auth.bearer) {
        postmanAuth.type = 'bearer';
        postmanAuth.bearer = [
          { key: 'token', value: auth.bearer.token },
        ];
      }
      break;

    case 'api-key':
      if (auth.apiKey) {
        postmanAuth.type = 'apikey';
        postmanAuth.apikey = [
          { key: 'key', value: auth.apiKey.key },
          { key: 'value', value: auth.apiKey.value },
          { key: 'in', value: auth.apiKey.addTo },
        ];
      }
      break;
  }

  return postmanAuth;
}

/**
 * Import Postman environment
 */
export function importPostmanEnvironment(postmanEnv: PostmanEnvironment): Environment {
  const variables: EnvironmentVariable[] = postmanEnv.values.map(variable => ({
    key: variable.key,
    value: variable.value,
    enabled: !variable.disabled,
    isSecret: variable.type === 'secret',
  }));

  return {
    id: postmanEnv.id || crypto.randomUUID(),
    name: postmanEnv.name,
    variables,
  };
}

/**
 * Export Requesto environment to Postman format
 */
export function exportEnvironmentToPostman(environment: Environment): PostmanEnvironment {
  const values: PostmanVariable[] = environment.variables.map(variable => ({
    key: variable.key,
    value: variable.value,
    type: variable.isSecret ? 'secret' : 'default',
    disabled: !variable.enabled,
  }));

  return {
    id: environment.id,
    name: environment.name,
    values,
    _postman_variable_scope: environment.name.toLowerCase().replace(/\s+/g, '-'),
  };
}

/**
 * Download data as a JSON file
 */
export function downloadJSON(data: any, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(url);
}

/**
 * Read and parse uploaded JSON file
 */
export function readJSONFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        resolve(json);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
