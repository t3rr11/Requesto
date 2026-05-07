import axios, { AxiosRequestConfig } from 'axios';
import fetch from 'node-fetch';
import https from 'node:https';
import FormData from 'form-data';
import { EnvironmentService } from './environment.service';
import { HistoryService } from './history.service';
import { OAuthService } from './oauth.service';
import { applyAuthentication, getAxiosAuthConfig, type OAuthTokenResolver } from '../utils/auth';
import { getHttpsAgent } from '../utils/httpsAgent';
import { encodeResponseBody } from '../utils/responseEncoding';
import type { ProxyRequest, ProxyResponse, FormDataEntry, BodyType } from '../models/proxy';

function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

function methodSupportsBody(method: string): boolean {
  return ['post', 'put', 'patch'].includes(method.toLowerCase());
}

function buildFormDataBody(entries: FormDataEntry[]): FormData {
  const form = new FormData();
  for (const entry of entries) {
    if (entry.type === 'file' && entry.fileContent) {
      const match = entry.fileContent.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const buffer = Buffer.from(match[2], 'base64');
        form.append(entry.key, buffer, { filename: entry.fileName || 'file', contentType: match[1] });
      }
    } else {
      form.append(entry.key, entry.value);
    }
  }
  return form;
}

function buildUrlEncodedBody(entries: FormDataEntry[]): string {
  const params = new URLSearchParams();
  for (const entry of entries) {
    params.append(entry.key, entry.value);
  }
  return params.toString();
}

/** Case-insensitive header existence check. */
function hasHeaderCI(headers: Record<string, string>, name: string): boolean {
  const target = name.toLowerCase();
  return Object.keys(headers).some((k) => k.toLowerCase() === target);
}

/**
 * Build the request body and merged headers, auto-injecting `Content-Type`
 * when the user hasn't supplied one. Used by both `executeRequest` (axios)
 * and `streamRequest` (fetch).
 *
 * Rules:
 *  - JSON (or unset bodyType + body present): default `application/json`.
 *  - x-www-form-urlencoded: default `application/x-www-form-urlencoded`.
 *  - form-data: always use the multipart `Content-Type` from form.getHeaders()
 *    so the boundary matches the body. A user-supplied Content-Type would
 *    break parsing, so it's discarded with a warning.
 *  - User-supplied Content-Type (any casing) is preserved for JSON / urlencoded.
 */
function buildBodyAndHeaders(opts: {
  method: string;
  bodyType?: BodyType;
  body?: string;
  formDataEntries?: FormDataEntry[];
  baseHeaders: Record<string, string>;
}): { headers: Record<string, string>; data: unknown; bufferBody?: Buffer | string } {
  const headers = { ...opts.baseHeaders };
  if (!methodSupportsBody(opts.method)) {
    return { headers, data: undefined };
  }

  const userHasContentType = hasHeaderCI(headers, 'content-type');

  if (opts.bodyType === 'form-data' && opts.formDataEntries?.length) {
    const form = buildFormDataBody(opts.formDataEntries);
    if (userHasContentType) {
      // Strip user-supplied CT so the multipart boundary is used.
      for (const k of Object.keys(headers)) {
        if (k.toLowerCase() === 'content-type') delete headers[k];
      }
      console.warn('[proxy] dropping user-supplied Content-Type for form-data request (boundary mismatch)');
    }
    Object.assign(headers, form.getHeaders());
    return { headers, data: form, bufferBody: form.getBuffer() };
  }

  if (opts.bodyType === 'x-www-form-urlencoded' && opts.formDataEntries?.length) {
    const data = buildUrlEncodedBody(opts.formDataEntries);
    if (!userHasContentType) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    return { headers, data, bufferBody: data };
  }

  if (opts.body) {
    if (!userHasContentType) {
      headers['Content-Type'] = 'application/json';
    }
    return { headers, data: opts.body, bufferBody: opts.body };
  }

  return { headers, data: undefined };
}

export class ProxyService {
  private readonly oauthResolver?: OAuthTokenResolver;

  constructor(
    private readonly environmentService: EnvironmentService,
    private readonly historyService: HistoryService,
    oauthService?: OAuthService,
  ) {
    if (oauthService) {
      this.oauthResolver = async (configId) => {
        const token = await oauthService.getValidAccessToken(configId);
        return { accessToken: token.accessToken, tokenType: token.tokenType };
      };
    }
  }

  async executeRequest(req: ProxyRequest): Promise<ProxyResponse> {
    const { method, url, headers, body, bodyType, formDataEntries, auth, insecureTls } = req;

    if (!isValidUrl(url)) {
      throw new Error('Invalid URL format');
    }

    const substituted = this.environmentService.substituteInRequest({ url, headers, body, formDataEntries });
    const substitutedAuth = this.environmentService.substituteInAuth(auth);
    const authenticated = await applyAuthentication(
      substitutedAuth,
      substituted.headers,
      substituted.url,
      this.oauthResolver,
    );

    const startTime = Date.now();

    const httpsAgent = getHttpsAgent(insecureTls);

    const built = buildBodyAndHeaders({
      method,
      bodyType,
      body: substituted.body,
      formDataEntries: substituted.formDataEntries,
      baseHeaders: authenticated.headers || {},
    });

    const config: AxiosRequestConfig = {
      method: method.toLowerCase(),
      url: authenticated.url,
      headers: built.headers,
      validateStatus: () => true,
      timeout: 30000,
      responseType: 'arraybuffer',
      ...(httpsAgent && { httpsAgent }),
    };

    const axiosAuth = getAxiosAuthConfig(substitutedAuth);
    if (axiosAuth) {
      config.auth = axiosAuth;
    }

    if (built.data !== undefined) {
      config.data = built.data;
    }

    const response = await axios(config);
    const duration = Date.now() - startTime;

    const responseHeaders = response.headers as Record<string, string>;
    const contentType =
      responseHeaders['content-type'] ??
      responseHeaders['Content-Type'] ??
      Object.entries(responseHeaders).find(([k]) => k.toLowerCase() === 'content-type')?.[1];

    let buffer: Buffer;
    if (Buffer.isBuffer(response.data)) {
      buffer = response.data;
    } else if (response.data instanceof ArrayBuffer) {
      buffer = Buffer.from(response.data);
    } else if (response.data == null) {
      buffer = Buffer.alloc(0);
    } else if (typeof response.data === 'string') {
      buffer = Buffer.from(response.data);
    } else {
      buffer = Buffer.from(JSON.stringify(response.data));
    }

    const encoded = encodeResponseBody(buffer, contentType);

    const proxyResponse: ProxyResponse = {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: encoded.body,
      bodyEncoding: encoded.bodyEncoding,
      duration,
    };

    this.historyService.save({
      method,
      url,
      headers,
      body,
      bodyType,
      status: response.status,
      statusText: response.statusText,
      duration,
    });

    return proxyResponse;
  }

  async streamRequest(req: ProxyRequest): Promise<{ response: import('node-fetch').Response; url: string }> {
    const { method, url, headers, body, bodyType, formDataEntries, auth, insecureTls } = req;

    if (!isValidUrl(url)) {
      throw new Error('Invalid URL format');
    }

    const substituted = this.environmentService.substituteInRequest({ url, headers, body, formDataEntries });
    const substitutedAuth = this.environmentService.substituteInAuth(auth);
    const authenticated = await applyAuthentication(
      substitutedAuth,
      substituted.headers,
      substituted.url,
      this.oauthResolver,
    );

    const built = buildBodyAndHeaders({
      method,
      bodyType,
      body: substituted.body,
      formDataEntries: substituted.formDataEntries,
      baseHeaders: authenticated.headers || {},
    });

    const fetchHeaders = built.headers;
    const fetchBody = built.bufferBody;

    const fetchOptions: Record<string, unknown> = {
      method: method.toUpperCase(),
      headers: fetchHeaders,
      compress: false,
      ...(fetchBody !== undefined && { body: fetchBody }),
      ...(insecureTls && {
        agent: (parsedUrl: URL) =>
          parsedUrl.protocol === 'https:'
            ? new https.Agent({ rejectUnauthorized: false })
            : undefined,
      }),
    };

    const response = await fetch(authenticated.url, fetchOptions as Parameters<typeof fetch>[1]);
    return { response, url: authenticated.url };
  }
}
