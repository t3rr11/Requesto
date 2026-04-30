import SwaggerParser from '@apidevtools/swagger-parser';
import crypto from 'crypto';
import type { OpenAPI, OpenAPIV3, OpenAPIV2 } from 'openapi-types';
import { convertV3Operations } from './v3';
import { convertV2Operations } from './v2';
import type {
  Collection,
  Folder,
  SavedRequest,
  OpenApiSpecLink,
  OpenApiEnvironmentVariable,
  ParsedSpecResult,
} from '../../models/collection';

/**
 * Parse an OpenAPI spec from a file path or URL, resolve all $refs,
 * and convert to a Requesto Collection + environment variables.
 */
export async function importOpenApiSpec(
  source: string,
  options?: { name?: string; linkSpec?: boolean },
): Promise<ParsedSpecResult> {
  const api = await SwaggerParser.validate(source) as OpenAPI.Document;
  const raw = JSON.stringify(api);
  const specHash = crypto.createHash('sha256').update(raw).digest('hex');

  const isV3 = isOpenApiV3(api);
  const title = isV3
    ? (api as OpenAPIV3.Document).info.title
    : (api as OpenAPIV2.Document).info.title;
  const description = isV3
    ? (api as OpenAPIV3.Document).info.description
    : (api as OpenAPIV2.Document).info.description;

  const collectionName = options?.name || title || 'Imported API';
  const collectionId = `col-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const now = Date.now();

  const folders: Folder[] = [];
  const requests: SavedRequest[] = [];
  const environments = extractEnvironments(api);

  if (isV3) {
    convertV3Operations(api as OpenAPIV3.Document, collectionId, folders, requests);
  } else {
    convertV2Operations(api as OpenAPIV2.Document, collectionId, folders, requests);
  }

  const openApiSpec: OpenApiSpecLink | undefined = options?.linkSpec
    ? { source, lastSyncedAt: now, specHash }
    : undefined;

  const collection: Collection = {
    id: collectionId,
    name: collectionName,
    description,
    folders,
    requests,
    openApiSpec,
  };

  return { collection, environments, specHash };
}

function isOpenApiV3(api: OpenAPI.Document): api is OpenAPIV3.Document {
  return 'openapi' in api;
}

function extractEnvironments(api: OpenAPI.Document): OpenApiEnvironmentVariable[] {
  const vars: OpenApiEnvironmentVariable[] = [];

  if (isOpenApiV3(api)) {
    const doc = api as OpenAPIV3.Document;
    doc.servers?.forEach((server, i) => {
      vars.push({
        key: i === 0 ? 'baseUrl' : `baseUrl_${i}`,
        value: server.url,
        enabled: i === 0,
      });
    });
  } else {
    const doc = api as OpenAPIV2.Document;
    const scheme = doc.schemes?.[0] || 'https';
    const host = doc.host || 'localhost';
    const basePath = doc.basePath || '';
    vars.push({
      key: 'baseUrl',
      value: `${scheme}://${host}${basePath}`,
      enabled: true,
    });
  }

  return vars;
}
