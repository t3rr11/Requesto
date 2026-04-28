import { useAlertStore } from '../store/alert/store';
import { Toast } from './Toast';

export function ToastContainer() {
  const toasts = useAlertStore((s) => s.toasts);
  const dismissToast = useAlertStore((s) => s.dismissToast);

  return (
    <div
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}
