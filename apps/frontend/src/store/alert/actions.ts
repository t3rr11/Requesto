import type { AlertVariant } from './types';

type SetState = (partial: Record<string, unknown>) => void;

const VARIANTS = new Set<string>(['error', 'warning', 'info', 'success']);

const variantTitles: Record<AlertVariant, string> = {
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
  success: 'Success',
};

/**
 * Show an alert. Supports two call signatures:
 *   showAlert('Something happened', 'success')        → auto-title from variant
 *   showAlert('Custom Title', 'Message text', 'error') → explicit title
 */
export function showAlert(
  set: SetState,
  titleOrMessage: string,
  messageOrVariant?: string,
  variant?: AlertVariant,
): void {
  if (messageOrVariant !== undefined && VARIANTS.has(messageOrVariant) && variant === undefined) {
    const v = messageOrVariant as AlertVariant;
    set({ isOpen: true, title: variantTitles[v], message: titleOrMessage, variant: v });
  } else {
    set({
      isOpen: true,
      title: titleOrMessage,
      message: messageOrVariant ?? '',
      variant: variant ?? 'info',
    });
  }
}

export function closeAlert(set: SetState): void {
  set({ isOpen: false });
}
