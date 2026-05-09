import { Dialog } from './Dialog';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const buttonVariant = variant === 'info' ? 'primary' : 'danger';

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
      <div className="flex justify-end gap-2 mt-6">
        <Button onClick={onClose} variant="ghost" size="md">
          {cancelText}
        </Button>
        <Button autoFocus onClick={handleConfirm} variant={buttonVariant} size="md">
          {confirmText}
        </Button>
      </div>
    </Dialog>
  );
}
