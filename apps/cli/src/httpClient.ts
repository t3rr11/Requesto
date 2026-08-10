import axios, { type AxiosRequestConfig } from 'axios';
import FormData from 'form-data';
import type { SavedRequest, EnvironmentVariable, OAuthToken, FormDataEntry, BodyType } from './types';
import { substituteVariables, substituteInAuth } from './variables';
import { applyAuthentication, getDigestAuthConfig, buildOAuthResolver } from './auth';

export interface CliResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  bodyEncoding: 'utf8' | 'base64';
  duration: number;
}

function isTextContentType(contentType: string | undefined): boolean {
  if (!contentType) return true;
  const ct = contentType.split(';')[0].trim().toLowerCase();
  if (!ct) return true;
  if (ct.startsWith('text/')) return true;
  if (ct.endsWith('+json') || ct.endsWith('+xml') || ct.endsWith('+yaml')) return true;
  return new Set([
    'application/json', 'application/xml', 'application/javascript',
    'application/ecmascript', 'application/x-www-form-urlencoded',
    'application/graphql', 'application/ld+json', 'application/yaml',
    'application/x-yaml',
  ]).has(ct);
}

function parseCharset(contentType: string | undefined): BufferEncoding {
  if (!contentType) return 'utf-8';
  const match = contentType.match(/charset\s*=\s*"?([^";]+)"?/i);
  if (!match) return 'utf-8';
  const charset = match[1].trim().toLowerCase();
  const supported: BufferEncoding[] = ['utf-8', 'utf8', 'ascii', 'latin1', 'binary', 'utf16le', 'ucs-2', 'ucs2'];
  return (supported.includes(charset as BufferEncoding) ? charset : 'utf-8') as BufferEncoding;
}

function getContentType(headers: Record<string, string>): string | undefined {
  const entry = Object.entries(headers).find(([k]) => k.toLowerCase() === 'content-type');
  return entry?.[1];
}

function hasHeaderCI(headers: Record<string, string>, name: string): boolean {
  return Object.keys(headers).some((k) => k.toLowerCase() === name.toLowerCase());
}

function methodSupportsBody(method: string): boolean {
  return ['post', 'put', 'patch'].includes(method.toLowerCase());
}

function buildFormData(entries: FormDataEntry[]): FormData {
  const form = new FormData();
  for (const entry of entries) {
    if (entry.type === 'file' && entry.fileContent) {
      const match = entry.fileContent.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        form.append(entry.key, Buffer.from(match[2], 'base64'), { filename: entry.fileName ?? 'file', contentType: match[1] });
      }
    } else {
      form.append(entry.key, entry.value);
    }
  }
  return form;
}

function buildBody(
  method: string,
  bodyType: BodyType | undefined,
  body: string | undefined,
  formDataEntries: FormDataEntry[] | undefined,
  baseHeaders: Record<string, string>,
): { headers: Record<string, string>; data: unknown } {
  const headers = { ...baseHeaders };
  if (!methodSupportsBody(method)) return { headers, data: undefined };

  const enabledEntries = formDataEntries?.filter((e) => e.enabled) ?? [];

  if (bodyType === 'form-data' && enabledEntries.length) {
    const form = buildFormData(enabledEntries);
    // Strip any user Content-Type — multipart boundary must come from the form
    for (const k of Object.keys(headers)) {
      if (k.toLowerCase() === 'content-type') delete headers[k];
    }
    Object.assign(headers, form.getHeaders());
    return { headers, data: form };
  }

  if (bodyType === 'x-www-form-urlencoded' && enabledEntries.length) {
    const params = new URLSearchParams();
    for (const e of enabledEntries) params.append(e.key, e.value);
    if (!hasHeaderCI(headers, 'content-type')) headers['Content-Type'] = 'application/x-www-form-urlencoded';
    return { headers, data: params.toString() };
  }

  if (body) {
    if (!hasHeaderCI(headers, 'content-type')) headers['Content-Type'] = 'application/json';
    return { headers, data: body };
  }

  return { headers, data: undefined };
}

function flattenHeaders(raw: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') result[key] = value;
    else if (Array.isArray(value)) result[key] = value.join(', ');
    else if (value != null) result[key] = String(value);
  }
  return result;
}

export async function executeRequest(
  request: SavedRequest,
  variables: EnvironmentVariable[],
  oauthTokens: Record<string, OAuthToken>,
): Promise<CliResponse> {
  const sub = (s: string) => substituteVariables(s, variables);

  let method: string;
  let url: string;
  let headers: Record<string, string>;
  let body: string | undefined;
  let data: unknown;
  let builtHeaders: Record<string, string>;

  // Build GraphQL request as a JSON POST
  if (request.requestType === 'graphql' && request.graphql) {
    const { document, variables: gqlVars, operationName } = request.graphql;
    const substitutedVarsStr = gqlVars ? sub(gqlVars) : '{}';
    let parsedVars: unknown = {};
    try { parsedVars = JSON.parse(substitutedVarsStr); } catch { /* malformed, send empty */ }

    const gqlBody: Record<string, unknown> = { query: sub(document) };
    if (parsedVars && typeof parsedVars === 'object' && Object.keys(parsedVars as object).length) {
      gqlBody['variables'] = parsedVars;
    }
    if (operationName) gqlBody['operationName'] = sub(operationName);

    method = 'POST';
    url = sub(request.url);
    headers = Object.fromEntries(
      Object.entries(request.headers ?? {}).map(([k, v]) => [k, sub(v)]),
    );
    if (!hasHeaderCI(headers, 'content-type')) headers['Content-Type'] = 'application/json';
    body = JSON.stringify(gqlBody);
    data = body;
    builtHeaders = headers;
  } else {
    method = request.method;
    url = sub(request.url);
    headers = Object.fromEntries(
      Object.entries(request.headers ?? {}).map(([k, v]) => [k, sub(v)]),
    );
    const formDataEntries = request.formDataEntries?.map((e) => ({ ...e, key: sub(e.key), value: e.type === 'text' ? sub(e.value) : e.value }));
    body = request.body ? sub(request.body) : undefined;
    const built = buildBody(method, request.bodyType, body, formDataEntries, headers);
    builtHeaders = built.headers;
    data = built.data;
  }

  const substitutedAuth = substituteInAuth(request.auth, variables);
  const oauthResolver = buildOAuthResolver(oauthTokens);
  const authed = await applyAuthentication(substitutedAuth, builtHeaders, url, oauthResolver);

  const digestAuth = getDigestAuthConfig(substitutedAuth);
  const config: AxiosRequestConfig = {
    method: method.toLowerCase(),
    url: authed.url,
    headers: authed.headers,
    validateStatus: () => true,
    timeout: 30_000,
    responseType: 'arraybuffer',
    ...(digestAuth && { auth: digestAuth }),
    ...(data !== undefined && { data }),
  };

  const startTime = Date.now();
  const response = await axios(config);
  const duration = Date.now() - startTime;

  const responseHeaders = flattenHeaders(response.headers as Record<string, unknown>);
  const contentType = getContentType(responseHeaders);

  let buffer: Buffer;
  if (Buffer.isBuffer(response.data)) buffer = response.data;
  else if (response.data instanceof ArrayBuffer) buffer = Buffer.from(response.data);
  else if (response.data == null) buffer = Buffer.alloc(0);
  else buffer = Buffer.from(String(response.data));

  let responseBody: string;
  let bodyEncoding: 'utf8' | 'base64';
  if (buffer.length === 0) {
    responseBody = '';
    bodyEncoding = 'utf8';
  } else if (isTextContentType(contentType)) {
    responseBody = buffer.toString(parseCharset(contentType));
    bodyEncoding = 'utf8';
  } else {
    responseBody = buffer.toString('base64');
    bodyEncoding = 'base64';
  }

  return {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    body: responseBody,
    bodyEncoding,
    duration,
  };
}
