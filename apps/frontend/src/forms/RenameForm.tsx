import { useState } from 'react';
import { Dialog } from '../components/Dialog';
import { Button } from '../components/Button';

interface RenameFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newName: string) => Promise<void>;
  currentName: string;
  title: string;
  label: string;
  placeholder?: string;
}

export const RenameForm = ({ 
  isOpen, 
  onClose, 
  onSave, 
  currentName, 
  title, 
  label,
  placeholder = 'Enter name...'
}: RenameFormProps) => {
  const [name, setName] = useState(currentName);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    
    setIsLoading(true);
    try {
      await onSave(name.trim());
      onClose();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName(currentName);
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title={title}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading) handleSave();
              if (e.key === 'Escape') handleClose();
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            placeholder={placeholder}
            disabled={isLoading}
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose} disabled={isLoading} variant="ghost" size="md">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isLoading} loading={isLoading} variant="primary" size="md">
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
