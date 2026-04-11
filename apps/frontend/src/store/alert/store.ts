import { create } from 'zustand';
import { showAlert, closeAlert } from './actions';
import type { AlertVariant } from './types';

type AlertState = {
  isOpen: boolean;
  title: string;
  message: string;
  variant: AlertVariant;
  showAlert: (titleOrMessage: string, messageOrVariant?: string, variant?: AlertVariant) => void;
  closeAlert: () => void;
};

export const useAlertStore = create<AlertState>((set) => ({
  isOpen: false,
  title: '',
  message: '',
  variant: 'info',
  showAlert: (titleOrMessage, messageOrVariant, variant) =>
    showAlert(set, titleOrMessage, messageOrVariant, variant),
  closeAlert: () => closeAlert(set),
}));
