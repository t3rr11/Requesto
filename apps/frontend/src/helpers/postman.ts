import type { Collection, SavedRequest, Folder } from '../store/collections/types';
import type { AuthConfig, BodyType, FormDataEntry } from '../store/request/types';
import type { Environment } from '../store/environments/types';

// ─── Postman v2.1.0 types (internal only) ────────────────────────────────────

type PostmanCollection = {
  info: { _postman_id?: string; name: string; description?: string; schema: string };
  item: PostmanItem[];
  auth?: PostmanAuth;
  variable?: PostmanVariable[];
};

type PostmanItem = {
  name: string;
  request?: PostmanRequest;
  item?: PostmanItem[];
  description?: string;
};

type PostmanRequest = {
  method: string;
  header?: PostmanHeader[];
  body?: PostmanBody;
  url: PostmanUrl | string;
  auth?: PostmanAuth;
};

type PostmanHeader = { key: string; value: string; type?: string; disabled?: boolean };

type PostmanBody = {
  mode: string;
  raw?: string;
  urlencoded?: { key: string; value: string; disabled?: boolean }[];
  formdata?: { key: string; value: string; type?: string; disabled?: boolean }[];
  options?: { raw?: { language?: string } };
};

type PostmanUrl = {
  raw: string;
  protocol?: string;
  host?: string[];
  path?: string[];
  query?: { key: string; value: string; disabled?: boolean }[];
  variable?: { key: string; value: string; description?: string }[];
};

type PostmanAuth = {
  type: string;
  basic?: { key: string; value: string }[];
  bearer?: { key: string; value: string }[];
  apikey?: { key: string; value: string }[];
  oauth2?: { key: string; value: string }[];
};

type PostmanVariable = { key: string; value: string; type?: string; disabled?: boolean };

type PostmanEnvironment = {
  id?: string;
  name: string;
  values: PostmanVariable[];
  _postman_variable_scope?: string;
};

// ─── Import helpers ──────────────────────────────────────────────────────────

export function importPostmanCollection(postmanData: PostmanCollection): Collection {
  const collectionId = crypto.randomUUID();
  const folders: Folder[] = [];
  const requests: SavedRequest[] = [];

  processItems(postmanData.item, collectionId, folders, requests, undefined);

  return {
    id: collectionId,
    name: postmanData.info.name,
    description: postmanData.info.description,
    folders,
    requests
  };
}

function processItems(
  items: PostmanItem[],
  collectionId: string,
  folders: Folder[],
  requests: SavedRequest[],
  parentFolderId?: string
): void {
  items.forEach((item, index) => {
    if (item.request) {
      const req = convertRequest(item, collectionId, parentFolderId);
      req.order = index;
      requests.push(req);
    } else if (item.item) {
      const folderId = crypto.randomUUID();
      folders.push({
        id: folderId,
        name: item.name,
        parentId: parentFolderId,
        collectionId
      });
      processItems(item.item, collectionId, folders, requests, folderId);
    }
  });
}

function convertRequest(
  item: PostmanItem,
  collectionId: string,
  folderId: string | undefined
): SavedRequest {
  const req = item.request!;
  const url = typeof req.url === 'string' ? req.url : req.url.raw;

  const headers: Record<string, string> = {};
  req.header?.forEach(h => {
    if (!h.disabled) headers[h.key] = h.value;
  });

  let body: string | undefined;
  let bodyType: BodyType | undefined;
  let formDataEntries: FormDataEntry[] | undefined;
  if (req.body) {
    if (req.body.mode === 'raw' && req.body.raw) {
      body = req.body.raw;
      bodyType = 'json';
    } else if (req.body.mode === 'urlencoded' && req.body.urlencoded) {
      bodyType = 'x-www-form-urlencoded';
      formDataEntries = req.body.urlencoded
        .filter(i => !i.disabled)
        .map((i, index) => ({
          id: (Date.now() + index).toString(),
          key: i.key,
          value: i.value,
          type: 'text' as const,
          enabled: true,
        }));
    } else if (req.body.mode === 'formdata' && req.body.formdata) {
      bodyType = 'form-data';
      formDataEntries = req.body.formdata
        .filter(i => !i.disabled)
        .map((i, index) => ({
          id: (Date.now() + index).toString(),
          key: i.key,
          value: i.value,
          type: 'text' as const,
          enabled: true,
        }));
    }
  }

  return {
    id: crypto.randomUUID(),
    name: item.name,
    method: req.method,
    url,
    headers,
    body,
    bodyType,
    formDataEntries,
    auth: convertAuth(req.auth),
    collectionId,
    folderId
  };
}

function convertAuth(pm?: PostmanAuth): AuthConfig | undefined {
  if (!pm) return { type: 'none' };
  const cfg: AuthConfig = { type: 'none' };
  switch (pm.type) {
    case 'basic': {
      const u = pm.basic?.find(i => i.key === 'username')?.value || '';
      const p = pm.basic?.find(i => i.key === 'password')?.value || '';
      cfg.type = 'basic';
      cfg.basic = { username: u, password: p };
      break;
    }
    case 'bearer': {
      const t = pm.bearer?.find(i => i.key === 'token')?.value || '';
      cfg.type = 'bearer';
      cfg.bearer = { token: t };
      break;
    }
    case 'apikey': {
      const k = pm.apikey?.find(i => i.key === 'key')?.value || '';
      const v = pm.apikey?.find(i => i.key === 'value')?.value || '';
      const a = (pm.apikey?.find(i => i.key === 'in')?.value || 'header') as 'header' | 'query';
      cfg.type = 'api-key';
      cfg.apiKey = { key: k, value: v, addTo: a };
      break;
    }
  }
  return cfg;
}

// ─── Export helpers ──────────────────────────────────────────────────────────

export function exportToPostman(collection: Collection): PostmanCollection {
  return {
    info: {
      _postman_id: collection.id,
      name: collection.name,
      description: collection.description,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: buildItems(collection),
  };
}

function buildItems(collection: Collection): PostmanItem[] {
  const items: PostmanItem[] = [];
  const folderMap = new Map<string, PostmanItem>();

  collection.folders.forEach(f => folderMap.set(f.id, { name: f.name, item: [] }));

  collection.folders.forEach(f => {
    const fi = folderMap.get(f.id)!;
    if (f.parentId) {
      folderMap.get(f.parentId)?.item!.push(fi);
    } else {
      items.push(fi);
    }
  });

  const sorted = [...collection.requests].sort((a, b) => (a.order || 0) - (b.order || 0));
  sorted.forEach(r => {
    const pi = toPostmanItem(r);
    if (r.folderId) {
      folderMap.get(r.folderId)?.item!.push(pi) ?? items.push(pi);
    } else {
      items.push(pi);
    }
  });

  return items;
}

function toPostmanItem(r: SavedRequest): PostmanItem {
  const pr: PostmanRequest = { method: r.method, header: [], url: r.url };
  if (r.headers) pr.header = Object.entries(r.headers).map(([k, v]) => ({ key: k, value: v, type: 'text' }));
  if (r.body) pr.body = { mode: 'raw', raw: r.body, options: { raw: { language: 'json' } } };
  if (r.auth) pr.auth = toPostmanAuth(r.auth);
  return { name: r.name, request: pr };
}

function toPostmanAuth(auth: AuthConfig): PostmanAuth | undefined {
  if (auth.type === 'none') return undefined;
  const pa: PostmanAuth = { type: auth.type };
  switch (auth.type) {
    case 'basic':
      pa.type = 'basic';
      pa.basic = [
        { key: 'username', value: auth.basic!.username },
        { key: 'password', value: auth.basic!.password },
      ];
      break;
    case 'bearer':
      pa.type = 'bearer';
      pa.bearer = [{ key: 'token', value: auth.bearer!.token }];
      break;
    case 'api-key':
      pa.type = 'apikey';
      pa.apikey = [
        { key: 'key', value: auth.apiKey!.key },
        { key: 'value', value: auth.apiKey!.value },
        { key: 'in', value: auth.apiKey!.addTo },
      ];
      break;
  }
  return pa;
}

// ─── Environment import/export ───────────────────────────────────────────────

export function importPostmanEnvironment(pm: PostmanEnvironment): Environment {
  return {
    id: pm.id || crypto.randomUUID(),
    name: pm.name,
    variables: pm.values.map(v => ({
      key: v.key,
      value: v.value,
      enabled: !v.disabled,
      isSecret: v.type === 'secret',
    })),
  };
}

export function exportEnvironmentToPostman(env: Environment): PostmanEnvironment {
  return {
    id: env.id,
    name: env.name,
    values: env.variables.map(v => ({
      key: v.key,
      value: v.value,
      type: v.isSecret ? 'secret' : 'default',
      disabled: !v.enabled,
    })),
    _postman_variable_scope: env.name.toLowerCase().replace(/\s+/g, '-'),
  };
}

// ─── File utilities ──────────────────────────────────────────────────────────

export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function readJSONFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        resolve(JSON.parse(e.target?.result as string));
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
