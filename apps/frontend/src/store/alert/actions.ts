import type { AlertVariant, Toast } from './types';

type AlertStateLike = { toasts: Toast[] };
type SetState = (
  partial: AlertStateLike | ((s: AlertStateLike) => AlertStateLike | Partial<AlertStateLike>),
) => void;

const VARIANTS = new Set<string>(['error', 'warning', 'info', 'success']);

const variantTitles: Record<AlertVariant, string> = {
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
  success: 'Success',
};

// Errors stay until dismissed; everything else auto-dismisses.
const DEFAULT_DURATION_MS = 4000;
const ERROR_DURATION_MS = 0;

let toastCounter = 0;
function nextId(): string {
  toastCounter += 1;
  return `toast-${Date.now()}-${toastCounter}`;
}

/**
 * Push a toast onto the queue. Two call signatures (preserved for back-compat):
 *   showAlert('Something happened', 'success')        → auto-title from variant
 *   showAlert('Custom Title', 'Message text', 'error') → explicit title
 */
export function showAlert(
  set: SetState,
  titleOrMessage: string,
  messageOrVariant?: string,
  variant?: AlertVariant,
): void {
  let title: string;
  let message: string;
  let v: AlertVariant;

  if (messageOrVariant !== undefined && VARIANTS.has(messageOrVariant) && variant === undefined) {
    v = messageOrVariant as AlertVariant;
    title = variantTitles[v];
    message = titleOrMessage;
  } else {
    v = variant ?? 'info';
    title = titleOrMessage;
    message = messageOrVariant ?? '';
  }

  const toast: Toast = {
    id: nextId(),
    title,
    message,
    variant: v,
    durationMs: v === 'error' ? ERROR_DURATION_MS : DEFAULT_DURATION_MS,
  };

  set((state) => ({ toasts: [...state.toasts, toast] }));
}

export function dismissToast(set: SetState, id: string): void {
  set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
}

export function clearToasts(set: SetState): void {
  set({ toasts: [] });
}

