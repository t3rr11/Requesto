import type { OpenAPIV3 } from 'openapi-types';
import type { SavedRequest, Folder } from '../../models/collection';
import type { AuthConfig, BodyType, FormDataEntry } from '../../models/proxy';
import { generateExampleFromSchema, resolveSchema, resolveParam, resolveParamArray } from './schema';

export function convertV3Operations(
  doc: OpenAPIV3.Document,
  collectionId: string,
  folders: Folder[],
  requests: SavedRequest[],
  now: number,
): void {
  const tagFolderMap = new Map<string, string>();
  const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;

  for (const [pathStr, pathItem] of Object.entries(doc.paths || {})) {
    if (!pathItem) continue;

    for (const method of httpMethods) {
      const operation = (pathItem as Record<string, unknown>)[method] as OpenAPIV3.OperationObject | undefined;
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
            createdAt: now,
            updatedAt: now,
          });
        }
        folderId = tagFolderMap.get(tag);
      }

      const operationId = operation.operationId || `${method}_${pathStr}`;
      const urlPath = pathStr.replace(/\{([^}]+)\}/g, '{{$1}}');

      const headers: Record<string, string> = {};
      let queryParams = '';
      const allParams = [
        ...resolveParamArray(pathItem.parameters),
        ...resolveParamArray(operation.parameters),
      ];

      for (const param of allParams) {
        const p = resolveParam(param);
        if (!p) continue;
        if (p.in === 'header') {
          headers[p.name] = p.schema
            ? String(generateExampleFromSchema(resolveSchema(p.schema)))
            : '';
        } else if (p.in === 'query') {
          const sep = queryParams ? '&' : '?';
          const val = p.schema
            ? String(generateExampleFromSchema(resolveSchema(p.schema)))
            : '';
          queryParams += `${sep}${p.name}=${val}`;
        }
      }

      const bodyResult = extractV3Body(operation.requestBody);
      if (bodyResult.bodyType === 'json' && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      const auth = extractV3Auth(operation.security || doc.security, doc);

      const request: SavedRequest = {
        id: `req-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: operation.summary || operationId,
        method: method.toUpperCase(),
        url: `{{baseUrl}}${urlPath}${queryParams}`,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        body: bodyResult.body,
        bodyType: bodyResult.bodyType,
        formDataEntries: bodyResult.formDataEntries,
        auth,
        collectionId,
        folderId,
        operationId,
        order: requests.length,
        createdAt: now,
        updatedAt: now,
      };

      requests.push(request);
    }
  }
}

function extractV3Body(
  requestBody: OpenAPIV3.ReferenceObject | OpenAPIV3.RequestBodyObject | undefined,
): { body?: string; bodyType?: BodyType; formDataEntries?: FormDataEntry[] } {
  if (!requestBody) return {};
  if ('$ref' in requestBody) return {};

  const rb = requestBody as OpenAPIV3.RequestBodyObject;
  const content = rb.content;
  if (!content) return {};

  if (content['application/json']) {
    const schema = content['application/json'].schema;
    const example = content['application/json'].example;
    if (example) {
      return { body: JSON.stringify(example, null, 2), bodyType: 'json' };
    }
    if (schema) {
      const generated = generateExampleFromSchema(resolveSchema(schema));
      return { body: JSON.stringify(generated, null, 2), bodyType: 'json' };
    }
    return { bodyType: 'json' };
  }

  if (content['multipart/form-data']) {
    const schema = content['multipart/form-data'].schema;
    if (schema && !('$ref' in schema) && schema.properties) {
      const entries: FormDataEntry[] = Object.entries(schema.properties).map(
        ([key, prop]) => ({
          id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          key,
          value: '',
          type: (!('$ref' in prop) && prop.format === 'binary' ? 'file' : 'text') as 'text' | 'file',
          enabled: true,
        }),
      );
      return { formDataEntries: entries, bodyType: 'form-data' };
    }
    return { bodyType: 'form-data' };
  }

  if (content['application/x-www-form-urlencoded']) {
    const schema = content['application/x-www-form-urlencoded'].schema;
    if (schema && !('$ref' in schema) && schema.properties) {
      const entries: FormDataEntry[] = Object.entries(schema.properties).map(
        ([key]) => ({
          id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          key,
          value: '',
          type: 'text' as const,
          enabled: true,
        }),
      );
      return { formDataEntries: entries, bodyType: 'x-www-form-urlencoded' };
    }
    return { bodyType: 'x-www-form-urlencoded' };
  }

  return {};
}

function extractV3Auth(
  security: OpenAPIV3.SecurityRequirementObject[] | undefined,
  doc: OpenAPIV3.Document,
): AuthConfig | undefined {
  if (!security || security.length === 0) return undefined;
  const schemes = doc.components?.securitySchemes;
  if (!schemes) return undefined;

  for (const req of security) {
    const schemeName = Object.keys(req)[0];
    if (!schemeName) continue;
    const scheme = schemes[schemeName];
    if (!scheme || '$ref' in scheme) continue;

    switch (scheme.type) {
      case 'http':
        if (scheme.scheme === 'basic') {
          return { type: 'basic', basic: { username: '', password: '' } };
        }
        if (scheme.scheme === 'bearer') {
          return { type: 'bearer', bearer: { token: '' } };
        }
        break;
      case 'apiKey':
        return {
          type: 'api-key',
          apiKey: {
            key: scheme.name || '',
            value: '',
            addTo: scheme.in === 'query' ? 'query' : 'header',
          },
        };
    }
  }

  return undefined;
}
