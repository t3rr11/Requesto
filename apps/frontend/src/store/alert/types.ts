export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export type Toast = {
  id: string;
  title: string;
  message: string;
  variant: AlertVariant;
  /** Auto-dismiss timeout in ms; 0 disables auto-dismiss (e.g. for errors). */
  durationMs: number;
};

