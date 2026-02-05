import { useState, useCallback } from 'react';

/**
 * Simple hook for managing dialog open/close state
 * 
 * Usage:
 * ```tsx
 * const dialog = useDialog();
 * 
 * <Button onClick={dialog.open}>Open</Button>
 * <Dialog isOpen={dialog.isOpen} onClose={dialog.close} title="My Dialog">
 *   <MyForm onSuccess={dialog.close} />
 * </Dialog>
 * ```
 */
export const useDialog = (defaultOpen = false) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
};

/**
 * Hook for managing dialog with context data
 * Useful when you need to pass data to the dialog when opening it
 * 
 * Usage:
 * ```tsx
 * const editDialog = useDialogWithData<User>();
 * 
 * <Button onClick={() => editDialog.open(user)}>Edit</Button>
 * <Dialog isOpen={editDialog.isOpen} onClose={editDialog.close}>
 *   {editDialog.data && <EditUserForm user={editDialog.data} onSuccess={editDialog.close} />}
 * </Dialog>
 * ```
 */
export const useDialogWithData = <T,>(defaultOpen = false) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [data, setData] = useState<T | null>(null);

  const open = useCallback((dialogData: T) => {
    setData(dialogData);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Keep data until animation completes (if any)
    setTimeout(() => setData(null), 300);
  }, []);

  const toggle = useCallback((dialogData?: T) => {
    if (dialogData) {
      setData(dialogData);
    }
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    data,
    open,
    close,
    toggle,
  };
};

/**
 * Hook for managing confirmation dialogs
 * 
 * Usage:
 * ```tsx
 * const confirmDialog = useConfirmDialog();
 * 
 * const handleDelete = () => {
 *   confirmDialog.open({
 *     title: 'Delete Item',
 *     message: 'Are you sure?',
 *     onConfirm: () => deleteItem()
 *   });
 * };
 * 
 * <ConfirmDialog {...confirmDialog.props} />
 * ```
 */
export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
}

export const useConfirmDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ConfirmDialogConfig>({
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const open = useCallback((dialogConfig: ConfirmDialogConfig) => {
    setConfig(dialogConfig);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleConfirm = useCallback(async () => {
    await config.onConfirm();
    close();
  }, [config, close]);

  return {
    isOpen,
    open,
    close,
    props: {
      ...config,
      isOpen,
      onClose: close,
      onConfirm: handleConfirm,
    },
  };
};
