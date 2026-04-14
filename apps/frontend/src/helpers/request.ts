import type { ProxyRequest, AuthConfig, FormDataEntry } from '../store/request/types';
import type { RequestFormData } from '../forms/schemas/requestFormSchema';
import type { TabRequest } from '../store/tabs/types';
import { buildUrlWithParams } from './url';

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
  return {
    method: formData.method || 'GET',
    url: buildUrlWithParams(formData.url, formData.params),
    headers: buildHeadersFromFormData(formData.headers),
    body: formData.body,
    bodyType: formData.bodyType || 'json',
    formDataEntries: formData.formDataEntries as FormDataEntry[],
    auth: formData.auth as AuthConfig,
  };
}

/**
 * Convert a fully-populated RequestFormData into a ProxyRequest ready to send.
 * Merges params into the URL, extracts enabled headers, and filters body vs form-data
 * appropriately for the active body type.
 */
export function buildRequestFromFormData(formData: RequestFormData): ProxyRequest {
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
export function buildSavePayloadFromFormData(formData: RequestFormData): Partial<ProxyRequest> {
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

  const payload: Partial<ProxyRequest> = {
    method: formData.method,
    url: buildUrlWithParams(formData.url, formData.params),
    headers: buildHeadersFromFormData(formData.headers),
    bodyType: formData.bodyType,
    auth,
  };

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
