import { useState, FormEvent, useEffect } from 'react';
import { Dialog } from '../components/Dialog';
import { collectionsApi } from '../helpers/api/collections';
import { useCollectionsStore } from '../store/useCollectionsStore';

interface NewRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedCollectionId?: string;
  preselectedFolderId?: string;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export const NewRequestForm = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  preselectedCollectionId,
  preselectedFolderId 
}: NewRequestFormProps) => {
  const { collections } = useCollectionsStore();
  const [name, setName] = useState('');
  const [method, setMethod] = useState('GET');
  const [collectionId, setCollectionId] = useState('');
  const [folderId, setFolderId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Set preselected values
      if (preselectedCollectionId) {
        setCollectionId(preselectedCollectionId);
      } else if (collections.length > 0 && !collectionId) {
        setCollectionId(collections[0].id);
      }
      
      if (preselectedFolderId) {
        setFolderId(preselectedFolderId);
      }
    }
  }, [isOpen, preselectedCollectionId, preselectedFolderId, collections, collectionId]);

  const selectedCollection = collections.find(c => c.id === collectionId);
  const availableFolders = selectedCollection?.folders || [];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Request name is required');
      return;
    }

    if (!collectionId) {
      setError('Please select a collection');
      return;
    }

    setLoading(true);
    try {
      await collectionsApi.addRequest(collectionId, {
        name: name.trim(),
        method,
        url: 'http://localhost:3000',
        headers: {},
        body: '',
        folderId: folderId || undefined,
      });
      setName('');
      setMethod('GET');
      setFolderId('');
      onSuccess();
      onClose();
    } catch (err) {
      setError('Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setMethod('GET');
    setFolderId('');
    setError('');
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="New Request">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        {collections.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded text-sm">
            No collections available. Please create a collection first.
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="request-name" className="block text-sm font-medium text-gray-700 mb-1">
                Request Name <span className="text-red-500">*</span>
              </label>
              <input
                id="request-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Request"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="request-method" className="block text-sm font-medium text-gray-700 mb-1">
                HTTP Method <span className="text-red-500">*</span>
              </label>
              <select
                id="request-method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="request-collection" className="block text-sm font-medium text-gray-700 mb-1">
                Collection <span className="text-red-500">*</span>
              </label>
              <select
                id="request-collection"
                value={collectionId}
                onChange={(e) => {
                  setCollectionId(e.target.value);
                  setFolderId(''); // Reset folder when collection changes
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
            </div>

            {availableFolders.length > 0 && (
              <div>
                <label htmlFor="request-folder" className="block text-sm font-medium text-gray-700 mb-1">
                  Folder (optional)
                </label>
                <select
                  id="request-folder"
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">-- Root Level --</option>
                  {availableFolders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded text-sm">
              A new empty request will be created with a default URL that you can edit.
            </div>
          </>
        )}

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
            disabled={loading || collections.length === 0}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Request'}
          </button>
        </div>
      </form>
    </Dialog>
  );
};
