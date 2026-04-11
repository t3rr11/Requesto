import { XCircle, AlertTriangle, Info, CheckCircle2, type LucideIcon } from 'lucide-react';
import { Dialog } from './Dialog';
import { Button } from './Button';

type AlertVariant = 'error' | 'warning' | 'info' | 'success';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: AlertVariant;
}

const iconConfig: Record<AlertVariant, { Icon: LucideIcon; bg: string; color: string }> = {
  error: { Icon: XCircle, bg: 'bg-red-50 dark:bg-red-900/20', color: 'text-red-500 dark:text-red-400' },
  warning: { Icon: AlertTriangle, bg: 'bg-orange-50 dark:bg-orange-900/20', color: 'text-orange-500 dark:text-orange-400' },
  info: { Icon: Info, bg: 'bg-blue-50 dark:bg-blue-900/20', color: 'text-blue-500 dark:text-blue-400' },
  success: { Icon: CheckCircle2, bg: 'bg-green-50 dark:bg-green-900/20', color: 'text-green-500 dark:text-green-400' },
};

export function AlertDialog({ isOpen, onClose, title, message, variant = 'info' }: AlertDialogProps) {
  const { Icon, bg, color } = iconConfig[variant];
  const hasDistinctMessage = message && message !== title;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={hasDistinctMessage ? title : ''} size="sm">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
          <Icon className={`w-4.5 h-4.5 ${color}`} />
        </div>
        <div className="min-w-0 pt-1.5">
          {hasDistinctMessage ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
          ) : (
            <p className="text-[15px] font-medium text-gray-800 dark:text-gray-200">{message || title}</p>
          )}
        </div>
      </div>
      <div className="flex justify-end mt-5">
        <Button onClick={onClose} variant="primary" size="md">
          OK
        </Button>
      </div>
    </Dialog>
  );
}
