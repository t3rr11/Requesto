import { useState, FormEvent } from 'react';
import { Dialog } from '../components/Dialog';
import { Button } from '../components/Button';
import { collectionsApi } from '../helpers/api/collections';

interface NewCollectionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewCollectionForm = ({ isOpen, onClose, onSuccess }: NewCollectionFormProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Collection name is required');
      return;
    }

    setLoading(true);
    try {
      await collectionsApi.create({ name: name.trim(), description: description.trim() || undefined });
      setName('');
      setDescription('');
      onSuccess();
      onClose();
    } catch (err) {
      setError('Failed to create collection');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setError('');
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="New Collection">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="collection-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            id="collection-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My API Collection"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="collection-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description (optional)
          </label>
          <textarea
            id="collection-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Collection for testing user APIs"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" onClick={handleClose} variant="ghost" size="md">
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md" loading={loading} disabled={loading}>
            Create Collection
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
