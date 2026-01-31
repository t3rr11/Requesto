import { useState, FormEvent } from 'react';
import { Dialog } from '../components/Dialog';
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
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="collection-name" className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="collection-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My API Collection"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="collection-description" className="block text-sm font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <textarea
            id="collection-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Collection for testing user APIs"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Collection'}
          </button>
        </div>
      </form>
    </Dialog>
  );
};
