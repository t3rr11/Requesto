import type { ProxyRequest, ProxyResponse, AuthConfig, FormDataEntry } from '../store/request/types';
import type { RequestFormData } from '../forms/schemas/requestFormSchema';
import type { TabRequest } from '../store/tabs/types';
import type { GraphQLRequestConfig, RequestSaveDraft, SavedRequest } from '../store/collections/types';
import { buildUrlWithParams } from './url';
import {
  buildClientSchema,
  getIntrospectionQuery,
  Kind,
  parse,
  type GraphQLSchema,
  type IntrospectionQuery,
} from 'graphql';

/**
 * Convert form header rows to a plain key/value headers object,
 * filtering out disabled rows and rows with empty keys.
 */
export function buildHeadersFromFormData(headers: RequestFormData['headers']): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach(h => {
    if (h.enabled && h.key.trim()) {
      result[h.key] = h.value;
    }
  });
  return result;
}

/**
 * Convert form data into a TabRequest for syncing with the tab store.
 * Preserves raw body and formDataEntries without filtering so users don't
 * lose in-progress data when switching between body types.
 */
export function buildTabRequestFromFormData(formData: RequestFormData): TabRequest {
  const requestType = formData.requestType ?? 'http';
  const request: TabRequest = {
    requestType,
    method: requestType === 'graphql' ? (formData.graphqlTransport ?? 'post').toUpperCase() : (formData.method || 'GET'),
    url: buildUrlWithParams(formData.url, formData.params),
    headers: buildHeadersFromFormData(formData.headers),
    auth: formData.auth as AuthConfig,
    preRequestScript: formData.preRequestScript,
    testScript: formData.testScript,
  };

  if (requestType === 'graphql') {
    request.graphql = buildGraphQLConfig(formData);
  } else {
    request.body = formData.body;
    request.bodyType = formData.bodyType || 'json';
    request.formDataEntries = formData.formDataEntries as FormDataEntry[];
  }

  return request;
}

function buildGraphQLConfig(formData: RequestFormData): GraphQLRequestConfig {
  const config: GraphQLRequestConfig = {
    document: formData.graphqlDocument ?? '',
    variables: formData.graphqlVariables ?? '',
    transport: formData.graphqlTransport ?? 'post',
  };
  if (formData.graphqlSchemaProfileId?.trim()) {
    config.schemaProfileId = formData.graphqlSchemaProfileId;
  }
  return config;
}

function parseGraphQLVariables(value: string | undefined): Record<string, unknown> | undefined {
  if (!value?.trim()) return undefined;
  const parsed: unknown = JSON.parse(value);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('GraphQL variables must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}

export type GraphQLOperationOption = {
  name: string | null;
  operation: 'query' | 'mutation' | 'subscription';
};

export function getGraphQLOperations(document: string): GraphQLOperationOption[] {
  if (!document.trim()) return [];
  try {
    return parse(document).definitions
      .filter(definition => definition.kind === Kind.OPERATION_DEFINITION)
      .map(definition => ({
        name: definition.name?.value ?? null,
        operation: definition.operation,
      }));
  } catch {
    return [];
  }
}

function getGraphQLOperation(document: string) {
  const operations = parse(document).definitions.filter(
    definition => definition.kind === Kind.OPERATION_DEFINITION,
  );
  if (operations.length > 1) {
    throw new Error('Multiple GraphQL operations are not supported. Keep one operation in the query.');
  }
  if (operations.length === 0) {
    throw new Error('GraphQL query must contain one operation');
  }
  return operations[0];
}

function setDefaultHeader(headers: Record<string, string>, name: string, value: string): void {
  if (!Object.keys(headers).some(key => key.toLowerCase() === name.toLowerCase())) {
    headers[name] = value;
  }
}

function buildGraphQLRequest(formData: RequestFormData): ProxyRequest {
  const document = formData.graphqlDocument?.trim() ?? '';
  if (!document) throw new Error('GraphQL query is required');

  const operation = getGraphQLOperation(document);
  const variables = parseGraphQLVariables(formData.graphqlVariables);
  const transport = formData.graphqlTransport ?? 'post';
  const headers = buildHeadersFromFormData(formData.headers);
  setDefaultHeader(headers, 'Accept', 'application/graphql-response+json, application/json;q=0.9');

  if (transport === 'get') {
    if (operation.operation !== 'query') {
      throw new Error('GraphQL GET requests can only execute query operations');
    }
    const url = new URL(buildUrlWithParams(formData.url, formData.params));
    url.searchParams.set('query', document);
    if (variables) url.searchParams.set('variables', JSON.stringify(variables));
    return { method: 'GET', url: url.toString(), headers, auth: formData.auth as AuthConfig };
  }

  setDefaultHeader(headers, 'Content-Type', 'application/json');
  const body = {
    query: document,
    ...(variables && { variables }),
  };
  return {
    method: 'POST',
    url: buildUrlWithParams(formData.url, formData.params),
    headers,
    body: JSON.stringify(body),
    bodyType: 'json',
    auth: formData.auth as AuthConfig,
  };
}

/**
 * Build a ProxyRequest from a saved GraphQL request. Mirrors buildGraphQLRequest
 * but works from the persisted SavedRequest shape, so the Collection Runner and
 * other non-form callers execute GraphQL requests correctly.
 */
export function buildSavedGraphQLRequest(req: SavedRequest): ProxyRequest {
  const config = req.graphql;
  if (!config) {
    // Legacy saved GraphQL request without a config: fall back to the stored raw fields
    return {
      method: req.method,
      url: req.url,
      headers: { ...(req.headers ?? {}) },
      body: req.body,
      bodyType: req.bodyType,
      formDataEntries: req.formDataEntries,
      auth: req.auth,
    };
  }

  const document = config.document.trim();
  if (!document) throw new Error('GraphQL query is required');

  const operation = getGraphQLOperation(document);
  const variables = parseGraphQLVariables(config.variables);
  const transport = config.transport ?? 'post';
  const headers = { ...(req.headers ?? {}) };
  setDefaultHeader(headers, 'Accept', 'application/graphql-response+json, application/json;q=0.9');

  if (transport === 'get') {
    if (operation.operation !== 'query') {
      throw new Error('GraphQL GET requests can only execute query operations');
    }
    const url = new URL(req.url);
    url.searchParams.set('query', document);
    if (variables) url.searchParams.set('variables', JSON.stringify(variables));
    return { method: 'GET', url: url.toString(), headers, auth: req.auth };
  }

  setDefaultHeader(headers, 'Content-Type', 'application/json');
  const body = {
    query: document,
    ...(variables && { variables }),
  };
  return {
    method: 'POST',
    url: req.url,
    headers,
    body: JSON.stringify(body),
    bodyType: 'json',
    auth: req.auth,
  };
}

export function buildGraphQLIntrospectionRequest(formData: RequestFormData): ProxyRequest {
  const headers = buildHeadersFromFormData(formData.headers);
  setDefaultHeader(headers, 'Accept', 'application/graphql-response+json, application/json;q=0.9');
  setDefaultHeader(headers, 'Content-Type', 'application/json');

  return {
    method: 'POST',
    url: buildUrlWithParams(formData.url, formData.params),
    headers,
    body: JSON.stringify({
      query: getIntrospectionQuery({ descriptions: true, schemaDescription: true }),
      operationName: 'IntrospectionQuery',
    }),
    bodyType: 'json',
    auth: formData.auth as AuthConfig,
  };
}

export function parseGraphQLIntrospectionResponse(response: ProxyResponse): GraphQLSchema {
  if (response.bodyEncoding !== 'utf8') {
    throw new Error('Schema endpoint returned a binary response');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(response.body);
  } catch {
    throw new Error('Schema endpoint did not return valid JSON');
  }

  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Schema endpoint returned an invalid GraphQL response');
  }

  const result = payload as {
    data?: IntrospectionQuery;
    errors?: Array<{ message?: string }>;
  };
  if (result.errors?.length) {
    throw new Error(result.errors.map(error => error.message || 'Introspection failed').join('\n'));
  }
  if (!result.data?.__schema) {
    throw new Error('Schema endpoint response did not include introspection data');
  }

  return buildClientSchema(result.data);
}

/**
 * Convert a fully-populated RequestFormData into a ProxyRequest ready to send.
 * Merges params into the URL, extracts enabled headers, and filters body vs form-data
 * appropriately for the active body type.
 */
export function buildRequestFromFormData(formData: RequestFormData): ProxyRequest {
  if ((formData.requestType ?? 'http') === 'graphql') {
    return buildGraphQLRequest(formData);
  }

  return {
    method: formData.method,
    url: buildUrlWithParams(formData.url, formData.params),
    headers: buildHeadersFromFormData(formData.headers),
    body: formData.bodyType === 'json' ? (formData.body || undefined) : undefined,
    bodyType: formData.bodyType,
    formDataEntries:
      formData.bodyType !== 'json'
        ? (formData.formDataEntries.filter(e => e.enabled && e.key.trim()) as FormDataEntry[])
        : undefined,
    auth: formData.auth as AuthConfig,
  };
}

/**
 * Build a save payload for persisting a request to a collection.
 * Unlike buildRequestFromFormData, this avoids proxy-oriented transformations
 * that cause false "changed" diffs (e.g. body "" → undefined, auth expanded with empty defaults).
 */
export function buildSavePayloadFromFormData(formData: RequestFormData): RequestSaveDraft {
  // Only include the active auth type's data to avoid empty defaults expanding the object
  const auth: AuthConfig = { type: formData.auth.type };
  if (formData.auth.type !== 'none') {
    const typeToKey: Record<string, keyof typeof formData.auth> = {
      basic: 'basic',
      bearer: 'bearer',
      'api-key': 'apiKey',
      digest: 'digest',
      oauth: 'oauth',
    };
    const key = typeToKey[formData.auth.type];
    if (key) {
      const sub = formData.auth[key];
      if (sub) {
        (auth as Record<string, unknown>)[key] = sub;
      }
    }
  }

  const payload: RequestSaveDraft = {
    requestType: formData.requestType ?? 'http',
    method:
      (formData.requestType ?? 'http') === 'graphql'
        ? (formData.graphqlTransport ?? 'post').toUpperCase()
        : formData.method,
    url: buildUrlWithParams(formData.url, formData.params),
    headers: buildHeadersFromFormData(formData.headers),
    auth,
    preRequestScript: formData.preRequestScript,
    testScript: formData.testScript,
  };

  if ((formData.requestType ?? 'http') === 'graphql') {
    payload.graphql = buildGraphQLConfig(formData);
    return payload;
  }

  payload.bodyType = formData.bodyType;

  // Only include body/formDataEntries for the active body type to avoid
  // sending empty values that differ from undefined in the stored data
  if (formData.bodyType === 'json') {
    payload.body = formData.body ?? '';
  } else {
    const entries = formData.formDataEntries.filter(e => e.enabled && e.key.trim()) as FormDataEntry[];
    if (entries.length > 0) {
      payload.formDataEntries = entries;
    }
  }

  return payload;
}
