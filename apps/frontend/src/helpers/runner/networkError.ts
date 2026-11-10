import type { ProxyResponse } from '../../store/request/types';

/**
 * The app's proxy controller wraps axios network failures inside a synthetic
 * HTTP-200 response (`status: 0`, statusText "Network Error"). The CLI reaches
 * the ProxyService directly, where the same failure throws, so the CLI's
 * collection runner marks network errors as `error` while the app's runner
 * used to report a green "passed". Converting the synthetic response into a
 * thrown error in the runner's send wrapper aligns the app with the CLI.
 *
 * Scoped to the collection runner: the main editor's send path and the proxy
 * controller are untouched.
 */
export function networkErrorFromResponse(response: ProxyResponse): Error | null {
  if (response.status !== 0) return null;
  let message = response.statusText.trim() || 'Network Error';
  try {
    const payload = JSON.parse(response.body) as { error?: unknown };
    if (typeof payload.error === 'string' && payload.error.trim()) {
      message = payload.error;
    }
  } catch {
    // Non-JSON body: keep the statusText ("Network Error") as the message.
  }
  return new Error(message);
}
