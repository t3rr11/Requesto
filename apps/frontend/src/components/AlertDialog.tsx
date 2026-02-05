import React from 'react';
import { XCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { Dialog } from './Dialog';
import { Button } from './Button';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: 'error' | 'warning' | 'info' | 'success';
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  variant = 'info',
}) => {
  const icons = {
    error: (
      <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
        <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
      </div>
    ),
    warning: (
      <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
      </div>
    ),
    info: (
      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
        <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />
      </div>
    ),
    success: (
      <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
      </div>
    ),
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="text-center">
        {icons[variant]}
        <p className="text-gray-700 dark:text-gray-300 mb-6">{message}</p>
        <Button onClick={onClose} variant="primary" size="md">
          OK
        </Button>
      </div>
    </Dialog>
  );
};
