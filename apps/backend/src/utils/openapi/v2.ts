import type { OpenAPIV2 } from 'openapi-types';
import type { SavedRequest, Folder } from '../../models/collection';
import type { AuthConfig, BodyType, FormDataEntry } from '../../models/proxy';
import { generateExampleFromSchema } from './schema';

export function convertV2Operations(
  doc: OpenAPIV2.Document,
  collectionId: string,
  folders: Folder[],
  requests: SavedRequest[]
): void {
  const tagFolderMap = new Map<string, string>();
  const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;

  for (const [pathStr, pathItem] of Object.entries(doc.paths || {})) {
    if (!pathItem) continue;

    for (const method of methods) {
      const operation = (pathItem as Record<string, OpenAPIV2.OperationObject>)[method];
      if (!operation) continue;

      const tag = operation.tags?.[0];
      let folderId: string | undefined;

      if (tag) {
        if (!tagFolderMap.has(tag)) {
          const id = `folder-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          tagFolderMap.set(tag, id);
          folders.push({
            id,
            name: tag,
            collectionId,
          });
        }
        folderId = tagFolderMap.get(tag);
      }

      const operationId = operation.operationId || `${method}_${pathStr}`;
      const urlPath = pathStr.replace(/\{([^}]+)\}/g, '{{$1}}');

      const headers: Record<string, string> = {};
      let queryParams = '';
      const params = (operation.parameters || []) as OpenAPIV2.Parameter[];

      let body: string | undefined;
      let bodyType: BodyType | undefined;
      let formDataEntries: FormDataEntry[] | undefined;

      for (const param of params) {
        if (param.in === 'header') {
          headers[param.name] = '';
        } else if (param.in === 'query') {
          const sep = queryParams ? '&' : '?';
          queryParams += `${sep}${param.name}=`;
        } else if (param.in === 'body' && 'schema' in param && param.schema) {
          bodyType = 'json';
          headers['Content-Type'] = 'application/json';
          body = JSON.stringify(generateExampleFromSchema(param.schema), null, 2);
        } else if (param.in === 'formData') {
          if (!formDataEntries) formDataEntries = [];
          bodyType = operation.consumes?.includes('multipart/form-data')
            ? 'form-data'
            : 'x-www-form-urlencoded';
          formDataEntries.push({
            id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
            key: param.name,
            value: '',
            type: param.type === 'file' ? 'file' : 'text',
            enabled: true,
          });
        }
      }

      const auth = extractV2Auth(operation.security || doc.security, doc);

      const request: SavedRequest = {
        id: `req-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: operation.summary || operationId,
        method: method.toUpperCase(),
        url: `{{baseUrl}}${urlPath}${queryParams}`,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        body,
        bodyType,
        formDataEntries,
        auth,
        collectionId,
        folderId,
        operationId,
        order: requests.length,
      };

      requests.push(request);
    }
  }
}

function extractV2Auth(
  security: OpenAPIV2.SecurityRequirementObject[] | undefined,
  doc: OpenAPIV2.Document,
): AuthConfig | undefined {
  if (!security || security.length === 0) return undefined;
  const defs = doc.securityDefinitions;
  if (!defs) return undefined;

  for (const req of security) {
    const schemeName = Object.keys(req)[0];
    if (!schemeName || !defs[schemeName]) continue;
    const scheme = defs[schemeName];

    if (scheme.type === 'basic') {
      return { type: 'basic', basic: { username: '', password: '' } };
    }
    if (scheme.type === 'apiKey') {
      return {
        type: 'api-key',
        apiKey: {
          key: scheme.name,
          value: '',
          addTo: scheme.in === 'query' ? 'query' : 'header',
        },
      };
    }
  }

  return undefined;
}
