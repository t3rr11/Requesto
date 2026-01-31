import { useState, FormEvent, useEffect } from 'react';
import { Dialog } from '../components/Dialog';
import { collectionsApi } from '../helpers/api/collections';
import { useCollectionsStore } from '../store/useCollectionsStore';
import { useRequestStore } from '../store/useRequestStore';

interface SaveRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentRequest: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
  } | null;
}

export const SaveRequestForm = ({ isOpen, onClose, onSuccess, currentRequest }: SaveRequestFormProps) => {
  const { collections, setActiveRequest } = useCollectionsStore();
  const { setCurrentSavedRequestId, setCurrentRequestData, currentRequestData } = useRequestStore();
  const [name, setName] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && currentRequest) {
      // Auto-generate a name from the request
      const urlObj = new URL(currentRequest.url, 'http://placeholder');
      const pathname = urlObj.pathname || '/';
      setName(`${currentRequest.method} ${pathname}`);
    }
  }, [isOpen, currentRequest]);

  useEffect(() => {
    // Auto-select first collection
    if (collections.length > 0 && !collectionId) {
      setCollectionId(collections[0].id);
    }
  }, [collections, collectionId]);

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

    if (!currentRequest) {
      setError('No request to save');
      return;
    }

    if (!currentRequest.url.trim()) {
      setError('Request URL is required');
      return;
    }

    setLoading(true);
    try {
      const savedRequest = await collectionsApi.addRequest(collectionId, {
        name: name.trim(),
        method: currentRequest.method,
        url: currentRequest.url,
        headers: currentRequest.headers,
        body: currentRequest.body,
      });
      
      // Update the UI to reflect this is now a saved request
      setActiveRequest(savedRequest.id);
      setCurrentSavedRequestId(savedRequest.id);
      
      // Update currentRequestData to include the savedRequestId
      if (currentRequestData) {
        setCurrentRequestData({
          ...currentRequestData,
          savedRequestId: savedRequest.id,
        });
      }
      
      setName('');
      onSuccess();
      onClose();
    } catch (err) {
      setError('Failed to save request');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setError('');
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Save Request">
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
                placeholder="Get User by ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="collection-select" className="block text-sm font-medium text-gray-700 mb-1">
                Collection <span className="text-red-500">*</span>
              </label>
              <select
                id="collection-select"
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a collection</option>
                {collections.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>

            {currentRequest && (
              <div className="bg-gray-50 p-3 rounded-md text-sm">
                <div className="font-medium text-gray-700 mb-2">Request Preview:</div>
                <div className="space-y-1 text-gray-600">
                  <div>
                    <span className="font-semibold">{currentRequest.method}</span> {currentRequest.url || <span className="text-red-500">No URL specified</span>}
                  </div>
                  {currentRequest.headers && Object.keys(currentRequest.headers).length > 0 && (
                    <div className="text-xs">
                      {Object.keys(currentRequest.headers).length} header(s)
                    </div>
                  )}
                  {currentRequest.body && (
                    <div className="text-xs">Body: {currentRequest.body.substring(0, 50)}...</div>
                  )}
                </div>
              </div>
            )}
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
            disabled={loading || collections.length === 0 || !currentRequest?.url?.trim()}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Request'}
          </button>
        </div>
      </form>
    </Dialog>
  );
};
