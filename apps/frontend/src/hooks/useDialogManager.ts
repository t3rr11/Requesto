import { useState, useCallback } from 'react';

export type DialogType = 'environment' | 'shortcuts' | null;

export const useDialogManager = () => {
  const [openDialog, setOpenDialog] = useState<DialogType>(null);

  const openEnvironmentManager = useCallback(() => {
    setOpenDialog('environment');
  }, []);

  const openKeyboardShortcuts = useCallback(() => {
    setOpenDialog('shortcuts');
  }, []);

  const closeDialog = useCallback(() => {
    setOpenDialog(null);
  }, []);

  return {
    openDialog,
    isEnvironmentManagerOpen: openDialog === 'environment',
    isKeyboardShortcutsOpen: openDialog === 'shortcuts',
    openEnvironmentManager,
    openKeyboardShortcuts,
    closeDialog,
  };
};
