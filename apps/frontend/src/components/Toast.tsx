import { useEffect, useState } from 'react';
import { XCircle, AlertTriangle, Info, CheckCircle2, X, type LucideIcon } from 'lucide-react';
import type { AlertVariant, Toast as ToastModel } from '../store/alert/types';

const iconConfig: Record<
  AlertVariant,
  { Icon: LucideIcon; iconBg: string; iconColor: string; border: string }
> = {
  error: {
    Icon: XCircle,
    iconBg: 'bg-red-50 dark:bg-red-900/30',
    iconColor: 'text-red-500 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800/50',
  },
  warning: {
    Icon: AlertTriangle,
    iconBg: 'bg-orange-50 dark:bg-orange-900/30',
    iconColor: 'text-orange-500 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800/50',
  },
  info: {
    Icon: Info,
    iconBg: 'bg-blue-50 dark:bg-blue-900/30',
    iconColor: 'text-blue-500 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800/50',
  },
  success: {
    Icon: CheckCircle2,
    iconBg: 'bg-green-50 dark:bg-green-900/30',
    iconColor: 'text-green-500 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800/50',
  },
};

interface ToastProps {
  toast: ToastModel;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const { Icon, iconBg, iconColor, border } = iconConfig[toast.variant];
  const hasDistinctMessage = toast.message && toast.message !== toast.title;
  const [leaving, setLeaving] = useState(false);
  const [entered, setEntered] = useState(false);

  // Slide-in on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Auto-dismiss
  useEffect(() => {
    if (toast.durationMs <= 0) return;
    const id = window.setTimeout(() => beginDismiss(), toast.durationMs);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.durationMs]);

  function beginDismiss() {
    setLeaving(true);
    window.setTimeout(() => onDismiss(toast.id), 180);
  }

  const transformClass = leaving
    ? 'translate-x-4 opacity-0'
    : entered
      ? 'translate-x-0 opacity-100'
      : 'translate-x-4 opacity-0';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto w-80 max-w-sm bg-white dark:bg-gray-800 border ${border} rounded-md shadow-lg overflow-hidden transition-all duration-150 ease-out ${transformClass}`}
    >
      <div className="flex items-start gap-3 p-3">
        <div
          className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center shrink-0`}
        >
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          {hasDistinctMessage ? (
            <>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {toast.title}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                {toast.message}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
              {toast.message || toast.title}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={beginDismiss}
          aria-label="Dismiss"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0 rounded p-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
