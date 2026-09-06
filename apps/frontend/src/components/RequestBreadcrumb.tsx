import { useState } from 'react';
import { useCollectionsStore } from '../store/collections/store';
import { RenameForm } from '../forms/RenameForm';
import { ChevronRight, Pencil } from 'lucide-react';

interface RequestBreadcrumbProps {
  savedRequestId: string | undefined;
}

export function RequestBreadcrumb({ savedRequestId }: Readonly<RequestBreadcrumbProps>) {
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
      <div className="flex items-center gap-2 truncate text-sm text-gray-600 dark:text-gray-400 min-w-0 flex-1 @container">
        <span className="truncate @max-[260px]:hidden">Collections</span>
        {collectionName && (
          <>
            <span className="@max-[260px]:hidden"><ChevronRight size={12} /></span>
            <span className="truncate @max-[200px]:hidden">{collectionName}</span>
          </>
        )}
        <span className="@max-[200px]:hidden"><ChevronRight size={12} /></span>
        {canRename ? (
          <button
            type="button"
            onClick={() => setIsRenameOpen(true)}
            title="Click to rename"
            className="group inline-flex items-center gap-1 text-gray-900 dark:text-gray-100 font-medium hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none cursor-pointer"
          >
            <span className="group-hover:underline group-focus:underline truncate">{requestName}</span>
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
