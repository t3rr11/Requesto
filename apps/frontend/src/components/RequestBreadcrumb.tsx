import { useCollectionsStore } from '../store/collections/store';

interface RequestBreadcrumbProps {
  savedRequestId: string | undefined;
}

export function RequestBreadcrumb({ savedRequestId }: RequestBreadcrumbProps) {
  const { collections } = useCollectionsStore();

  const getBreadcrumbInfo = (): { collectionName: string | null; requestName: string } => {
    if (!savedRequestId) return { collectionName: null, requestName: 'Untitled Request' };

    for (const collection of collections) {
      const request = collection.requests.find(r => r.id === savedRequestId);
      if (request) {
        return { collectionName: collection.name, requestName: request.name };
      }
    }

    return { collectionName: null, requestName: 'Untitled Request' };
  };

  const { collectionName, requestName } = getBreadcrumbInfo();

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
      <span>Collections</span>
      {collectionName && (
        <>
          <span>›</span>
          <span>{collectionName}</span>
        </>
      )}
      <span>›</span>
      <span className="text-gray-900 dark:text-gray-100 font-medium">{requestName}</span>
    </div>
  );
}
