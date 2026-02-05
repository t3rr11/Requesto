import { useState, FormEvent, useEffect } from 'react';
import { Button } from '../components/Button';
import { collectionsApi } from '../helpers/api/collections';
import { useCollectionsStore } from '../store/useCollectionsStore';
import { useAlertStore } from '../store/useAlertStore';

interface NewRequestFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  preselectedCollectionId?: string;
  preselectedFolderId?: string;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export const NewRequestForm = ({ 
  onSuccess, 
  onCancel, 
  preselectedCollectionId,
  preselectedFolderId 
}: NewRequestFormProps) => {
  const { collections, loadCollections } = useCollectionsStore();
  const { showAlert } = useAlertStore();
  const [name, setName] = useState('');
  const [method, setMethod] = useState('GET');
  const [collectionId, setCollectionId] = useState('');
  const [folderId, setFolderId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Set preselected values
    if (preselectedCollectionId) {
      setCollectionId(preselectedCollectionId);
    } else if (collections.length > 0 && !collectionId) {
      setCollectionId(collections[0].id);
    }
    
    if (preselectedFolderId) {
      setFolderId(preselectedFolderId);
    }
  }, [preselectedCollectionId, preselectedFolderId, collections, collectionId]);

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
      await loadCollections();
      setName('');
      setMethod('GET');
      setFolderId('');
      showAlert('Success', 'Request created successfully', 'success');
      onSuccess();
    } catch (err) {
      setError('Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName('');
    setMethod('GET');
    setFolderId('');
    setError('');
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        {collections.length === 0 ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-400 px-3 py-2 rounded text-sm">
            No collections available. Please create a collection first.
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="request-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Request Name <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                id="request-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Request"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="request-method" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                HTTP Method <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <select
                id="request-method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="request-collection" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Collection <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <select
                id="request-collection"
                value={collectionId}
                onChange={(e) => {
                  setCollectionId(e.target.value);
                  setFolderId(''); // Reset folder when collection changes
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                <label htmlFor="request-folder" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Folder (optional)
                </label>
                <select
                  id="request-folder"
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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

            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-400 px-3 py-2 rounded text-sm">
              A new empty request will be created with a default URL that you can edit.
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" onClick={handleCancel} variant="ghost" size="md">
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md" loading={loading} disabled={loading || collections.length === 0}>
            Create Request
          </Button>
        </div>
      </form>
  );
};
