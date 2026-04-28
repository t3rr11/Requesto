import { create } from 'zustand';
import { showAlert, dismissToast, clearToasts } from './actions';
import type { AlertVariant, Toast } from './types';

type AlertState = {
  toasts: Toast[];
  showAlert: (titleOrMessage: string, messageOrVariant?: string, variant?: AlertVariant) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
};

export const useAlertStore = create<AlertState>((set) => ({
  toasts: [],
  showAlert: (titleOrMessage, messageOrVariant, variant) =>
    showAlert(set, titleOrMessage, messageOrVariant, variant),
  dismissToast: (id) => dismissToast(set, id),
  clearToasts: () => clearToasts(set),
}));

