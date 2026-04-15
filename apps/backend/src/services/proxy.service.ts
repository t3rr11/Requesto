import axios, { AxiosRequestConfig } from 'axios';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { EnvironmentService } from './environment.service';
import { HistoryService } from './history.service';
import { applyAuthentication, getAxiosAuthConfig } from '../utils/auth';
import type { ProxyRequest, ProxyResponse, FormDataEntry } from '../models/proxy';

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

export class ProxyService {
  constructor(
    private readonly environmentService: EnvironmentService,
    private readonly historyService: HistoryService,
  ) {}

  async executeRequest(req: ProxyRequest): Promise<ProxyResponse> {
    const { method, url, headers, body, bodyType, formDataEntries, auth } = req;

    if (!isValidUrl(url)) {
      throw new Error('Invalid URL format');
    }

    const substituted = this.environmentService.substituteInRequest({ url, headers, body, formDataEntries });
    const authenticated = applyAuthentication(auth, substituted.headers, substituted.url);

    const startTime = Date.now();

    const config: AxiosRequestConfig = {
      method: method.toLowerCase(),
      url: authenticated.url,
      headers: authenticated.headers || {},
      validateStatus: () => true,
      timeout: 30000,
    };

    const axiosAuth = getAxiosAuthConfig(auth);
    if (axiosAuth) {
      config.auth = axiosAuth;
    }

    if (methodSupportsBody(method)) {
      if (bodyType === 'form-data' && substituted.formDataEntries?.length) {
        const form = buildFormDataBody(substituted.formDataEntries);
        config.data = form;
        config.headers = { ...config.headers, ...form.getHeaders() };
      } else if (bodyType === 'x-www-form-urlencoded' && substituted.formDataEntries?.length) {
        config.data = buildUrlEncodedBody(substituted.formDataEntries);
        config.headers = { ...config.headers, 'Content-Type': 'application/x-www-form-urlencoded' };
      } else if (substituted.body) {
        config.data = substituted.body;
      }
    }

    const response = await axios(config);
    const duration = Date.now() - startTime;

    const proxyResponse: ProxyResponse = {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>,
      body: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
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
    const { method, url, headers, body, bodyType, formDataEntries, auth } = req;

    if (!isValidUrl(url)) {
      throw new Error('Invalid URL format');
    }

    const substituted = this.environmentService.substituteInRequest({ url, headers, body, formDataEntries });
    const authenticated = applyAuthentication(auth, substituted.headers, substituted.url);

    const fetchHeaders: Record<string, string> = { ...(authenticated.headers || {}) };
    let fetchBody: string | Buffer | undefined;

    if (methodSupportsBody(method)) {
      if (bodyType === 'form-data' && substituted.formDataEntries?.length) {
        const form = buildFormDataBody(substituted.formDataEntries);
        fetchBody = form.getBuffer();
        Object.assign(fetchHeaders, form.getHeaders());
      } else if (bodyType === 'x-www-form-urlencoded' && substituted.formDataEntries?.length) {
        fetchBody = buildUrlEncodedBody(substituted.formDataEntries);
        fetchHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
      } else if (substituted.body) {
        fetchBody = substituted.body;
      }
    }

    const fetchOptions: Record<string, unknown> = {
      method: method.toUpperCase(),
      headers: fetchHeaders,
      ...(fetchBody !== undefined && { body: fetchBody }),
    };

    const response = await fetch(authenticated.url, fetchOptions as Parameters<typeof fetch>[1]);
    return { response, url: authenticated.url };
  }
}
