import { Dialog } from './Dialog';
import { SettingsForm } from '../forms/SettingsForm';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Settings" size="md">
      <SettingsForm onSuccess={onClose} onCancel={onClose} />
    </Dialog>
  );
}
