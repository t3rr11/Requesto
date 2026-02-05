import React from 'react';
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

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const buttonVariant = variant === 'danger' ? 'danger' : variant === 'warning' ? 'danger' : 'primary';

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="text-gray-700 dark:text-gray-300 mb-6">{message}</div>
      <div className="flex justify-end gap-2">
        <Button onClick={onClose} variant="ghost" size="md">
          {cancelText}
        </Button>
        <Button onClick={handleConfirm} variant={buttonVariant} size="md">
          {confirmText}
        </Button>
      </div>
    </Dialog>
  );
};
