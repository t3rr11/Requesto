import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog } from '../components/Dialog';
import { Button } from '../components/Button';

const commitMessageSchema = z.object({
  message: z.string().min(1, 'Commit message is required').max(500, 'Commit message is too long'),
});

type CommitMessageFormData = z.infer<typeof commitMessageSchema>;

interface CommitAndPushFormProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (message: string) => Promise<void>;
  changedCount: number;
}

export function CommitAndPushForm({ isOpen, onClose, onConfirm, changedCount }: CommitAndPushFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CommitMessageFormData>({
    resolver: zodResolver(commitMessageSchema),
    defaultValues: { message: '' },
  });

  const onSubmit = async (data: CommitMessageFormData) => {
    await onConfirm(data.message.trim());
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Commit & Push">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          You have {changedCount} uncommitted change{changedCount !== 1 ? 's' : ''}. Enter a commit message to commit and push.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Commit Message
          </label>
          <input
            type="text"
            {...register('message')}
            onKeyDown={e => {
              if (e.key === 'Escape') handleClose();
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Describe your changes..."
            disabled={isSubmitting}
            autoFocus
          />
          {errors.message && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.message.message}</p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose} disabled={isSubmitting} variant="ghost" size="md">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} loading={isSubmitting} variant="primary" size="md">
            Commit & Push
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
