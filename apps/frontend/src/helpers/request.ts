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
