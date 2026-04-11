import { useState, useCallback } from 'react';

/**
 * Simple hook for managing dialog open/close state.
 *
 * @example
 * const dialog = useDialog();
 * <Button onClick={dialog.open}>Open</Button>
 * <Dialog isOpen={dialog.isOpen} onClose={dialog.close} title="My Dialog">
 *   <MyForm onSuccess={dialog.close} />
 * </Dialog>
 */
export function useDialog(defaultOpen = false) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return { isOpen, open, close, toggle };
}

/**
 * Hook for managing dialog with associated context data.
 * Useful when you need to pass data to the dialog when opening it.
 *
 * @example
 * const editDialog = useDialogWithData<User>();
 * <Button onClick={() => editDialog.open(user)}>Edit</Button>
 * <Dialog isOpen={editDialog.isOpen} onClose={editDialog.close}>
 *   {editDialog.data && <EditUserForm user={editDialog.data} />}
 * </Dialog>
 */
export function useDialogWithData<T>(defaultOpen = false) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [data, setData] = useState<T | null>(null);

  const open = useCallback((dialogData: T) => {
    setData(dialogData);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => setData(null), 300);
  }, []);

  const toggle = useCallback((dialogData?: T) => {
    if (dialogData) setData(dialogData);
    setIsOpen(prev => !prev);
  }, []);

  return { isOpen, data, open, close, toggle };
}

/**
 * Hook for managing confirmation dialogs.
 *
 * @example
 * const confirmDialog = useConfirmDialog();
 * confirmDialog.open({
 *   title: 'Delete Item',
 *   message: 'Are you sure?',
 *   onConfirm: () => deleteItem(),
 * });
 * <ConfirmDialog {...confirmDialog.props} />
 */
export type ConfirmDialogConfig = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
};

export function useConfirmDialog() {
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

  const close = useCallback(() => setIsOpen(false), []);

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
}
