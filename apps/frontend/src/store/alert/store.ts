import { create } from 'zustand';

type AlertVariant = 'error' | 'warning' | 'info' | 'success';

const VARIANTS: Set<string> = new Set(['error', 'warning', 'info', 'success']);

const variantTitles: Record<AlertVariant, string> = {
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
  success: 'Success',
};

interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
  variant: AlertVariant;
  
  // Actions
  // Supports: showAlert(message, variant?) OR showAlert(title, message, variant?)
  showAlert: (titleOrMessage: string, messageOrVariant?: string, variant?: AlertVariant) => void;
  closeAlert: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  isOpen: false,
  title: '',
  message: '',
  variant: 'info',
  
  showAlert: (titleOrMessage, messageOrVariant, variant) => {
    // 2-arg form: showAlert('Something happened', 'success')
    if (messageOrVariant !== undefined && VARIANTS.has(messageOrVariant) && variant === undefined) {
      const v = messageOrVariant as AlertVariant;
      set({
        isOpen: true,
        title: variantTitles[v],
        message: titleOrMessage,
        variant: v,
      });
    } else {
      // 3-arg form: showAlert('Title', 'Message', 'variant')
      set({
        isOpen: true,
        title: titleOrMessage,
        message: messageOrVariant ?? '',
        variant: variant ?? 'info',
      });
    }
  },
  
  closeAlert: () => set({
    isOpen: false,
  }),
}));
