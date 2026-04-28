import { useState } from 'react';
import { useCollectionsStore } from '../store/collections/store';
import { RenameForm } from '../forms/RenameForm';
import { Pencil } from 'lucide-react';

interface RequestBreadcrumbProps {
  savedRequestId: string | undefined;
}

export function RequestBreadcrumb({ savedRequestId }: RequestBreadcrumbProps) {
  const { collections, updateRequest } = useCollectionsStore();
  const [isRenameOpen, setIsRenameOpen] = useState(false);

  const findRequest = () => {
    if (!savedRequestId) return null;
    for (const collection of collections) {
      const request = collection.requests.find(r => r.id === savedRequestId);
      if (request) return { collection, request };
    }
    return null;
  };

  const found = findRequest();
  const collectionName = found?.collection.name ?? null;
  const requestName = found?.request.name ?? 'Untitled Request';
  const canRename = found !== null;

  const handleSaveRename = async (newName: string) => {
    if (!found) return;
    await updateRequest(found.collection.id, found.request.id, { name: newName });
  };

  return (
    <>
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <span>Collections</span>
        {collectionName && (
          <>
            <span>›</span>
            <span>{collectionName}</span>
          </>
        )}
        <span>›</span>
        {canRename ? (
          <button
            type="button"
            onClick={() => setIsRenameOpen(true)}
            title="Click to rename"
            className="group inline-flex items-center gap-1 text-gray-900 dark:text-gray-100 font-medium hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none cursor-pointer"
          >
            <span className="group-hover:underline group-focus:underline">{requestName}</span>
            <Pencil className="h-3 w-3 text-gray-500 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
          </button>
        ) : (
          <span className="text-gray-900 dark:text-gray-100 font-medium">{requestName}</span>
        )}
      </div>

      {found && (
        <RenameForm
          isOpen={isRenameOpen}
          onClose={() => setIsRenameOpen(false)}
          onSave={handleSaveRename}
          currentName={found.request.name}
          title="Rename Request"
          label="Request Name"
          placeholder="Enter request name..."
        />
      )}
    </>
  );
}
