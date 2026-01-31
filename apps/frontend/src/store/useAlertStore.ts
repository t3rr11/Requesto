import { create } from 'zustand';

interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
  variant: 'error' | 'warning' | 'info' | 'success';
  
  // Actions
  showAlert: (title: string, message: string, variant?: 'error' | 'warning' | 'info' | 'success') => void;
  closeAlert: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  isOpen: false,
  title: '',
  message: '',
  variant: 'info',
  
  showAlert: (title, message, variant = 'info') => set({
    isOpen: true,
    title,
    message,
    variant,
  }),
  
  closeAlert: () => set({
    isOpen: false,
  }),
}));
