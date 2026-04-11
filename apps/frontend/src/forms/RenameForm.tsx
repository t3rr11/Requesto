import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog } from '../components/Dialog';
import { Button } from '../components/Button';
import { renameSchema, type RenameFormData } from './schemas/renameSchema';

interface RenameFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newName: string) => Promise<void>;
  currentName: string;
  title: string;
  label: string;
  placeholder?: string;
}

export function RenameForm({
  isOpen,
  onClose,
  onSave,
  currentName,
  title,
  label,
  placeholder = 'Enter name...',
}: RenameFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RenameFormData>({
    resolver: zodResolver(renameSchema),
    defaultValues: {
      name: currentName,
    },
  });

  useEffect(() => {
    reset({ name: currentName });
  }, [currentName, reset]);

  const onSubmit = async (data: RenameFormData) => {
    await onSave(data.name);
    onClose();
  };

  const handleClose = () => {
    reset({ name: currentName });
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title={title}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>
          <input
            type="text"
            {...register('name')}
            onKeyDown={e => {
              if (e.key === 'Escape') handleClose();
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            placeholder={placeholder}
            disabled={isSubmitting}
            autoFocus
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose} disabled={isSubmitting} variant="ghost" size="md">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} loading={isSubmitting} variant="primary" size="md">
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
