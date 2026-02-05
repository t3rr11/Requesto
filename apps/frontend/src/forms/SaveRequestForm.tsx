import { useState, FormEvent, useEffect } from 'react';
import { Dialog } from '../components/Dialog';
import { Button } from '../components/Button';
import { collectionsApi } from '../helpers/api/collections';
import { useCollectionsStore } from '../store/useCollectionsStore';
import { useTabsStore } from '../store/useTabsStore';
import { AuthConfig } from '../types';

interface SaveRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentRequest: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
    auth?: AuthConfig;
  } | null;
}

export const SaveRequestForm = ({ isOpen, onClose, onSuccess, currentRequest }: SaveRequestFormProps) => {
  const { collections, setActiveRequest } = useCollectionsStore();
  const { markTabAsSaved, updateTabLabel, activeTabId } = useTabsStore();
  const [name, setName] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && currentRequest) {
      // Auto-generate a name from the request
      // Extract pathname without URL encoding to preserve variables like {{baseUrl}}
      let pathname = '/';
      try {
        const url = currentRequest.url.trim();
        if (url) {
          // Check if it's a full URL
          if (url.match(/^https?:\/\//)) {
            const urlObj = new URL(url);
            pathname = urlObj.pathname;
          } else {
            // It's just a path or path with host, extract the path part
            const pathMatch = url.match(/^(?:https?:\/\/)?[^/]*(\/[^?#]*)?/);
            pathname = pathMatch?.[1] || '/';
          }
        }
      } catch {
        // If URL parsing fails, try to extract just the path
        const pathMatch = currentRequest.url.match(/^(?:https?:\/\/)?[^/]*(\/[^?#]*)?/);
        pathname = pathMatch?.[1] || currentRequest.url || '/';
      }
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
        auth: currentRequest.auth,
      });
      
      // Update the UI to reflect this is now a saved request
      setActiveRequest(savedRequest.id);
      
      // Mark the active tab as saved
      if (activeTabId) {
        markTabAsSaved(activeTabId, savedRequest.id, collectionId);
        updateTabLabel(activeTabId, name.trim());
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
                placeholder="Get User by ID"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="collection-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Collection <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <select
                id="collection-select"
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md text-sm">
                <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Request Preview:</div>
                <div className="space-y-1 text-gray-600 dark:text-gray-400">
                  <div>
                    <span className="font-semibold">{currentRequest.method}</span> {currentRequest.url || <span className="text-red-500 dark:text-red-400">No URL specified</span>}
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
          <Button type="button" onClick={handleClose} variant="ghost" size="md">
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md" loading={loading} disabled={loading || collections.length === 0 || !currentRequest?.url?.trim()}>
            Save Request
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
