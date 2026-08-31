import { parse, Kind } from 'graphql';
import type { ProxyRequest, SavedRequest } from '../types.ts';

/**
 * Port of the client's `buildSavedGraphQLRequest`
 * (apps/frontend/src/helpers/request.ts) so GraphQL requests execute
 * identically in headless runs.
 */

type GraphQLOperation = { operation: 'query' | 'mutation' | 'subscription' };

function getGraphQLOperation(document: string): GraphQLOperation {
  const operations = parse(document).definitions.filter(
    (definition) => definition.kind === Kind.OPERATION_DEFINITION,
  ) as GraphQLOperation[];
  if (operations.length > 1) {
    throw new Error('Multiple GraphQL operations are not supported. Keep one operation in the query.');
  }
  if (operations.length === 0) {
    throw new Error('GraphQL query must contain one operation');
  }
  return operations[0];
}

function parseGraphQLVariables(value: string | undefined): Record<string, unknown> | undefined {
  if (!value?.trim()) return undefined;
  const parsed: unknown = JSON.parse(value);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('GraphQL variables must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}

function setDefaultHeader(headers: Record<string, string>, name: string, value: string): void {
  if (!Object.keys(headers).some((key) => key.toLowerCase() === name.toLowerCase())) {
    headers[name] = value;
  }
}

/** Build a ProxyRequest from a saved GraphQL request. */
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

/** Build a ProxyRequest from any saved request (HTTP or GraphQL). */
export function buildProxyRequest(req: SavedRequest, insecureTls?: boolean): ProxyRequest {
  if (req.requestType === 'graphql') {
    return { ...buildSavedGraphQLRequest(req), insecureTls };
  }
  return {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    bodyType: req.bodyType,
    formDataEntries: req.formDataEntries,
    auth: req.auth,
    insecureTls,
  };
}
