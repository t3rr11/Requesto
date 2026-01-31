import { useCollectionsStore } from '../store/useCollectionsStore';

interface RequestBreadcrumbProps {
  savedRequestId?: string;
}

export function RequestBreadcrumb({ savedRequestId }: RequestBreadcrumbProps) {
  const { collections, activeRequestId } = useCollectionsStore();

  const getBreadcrumbInfo = () => {
    const requestId = savedRequestId || activeRequestId;
    
    if (!requestId) {
      return { collectionName: null, requestName: 'Untitled Request' };
    }

    for (const collection of collections) {
      const request = collection.requests.find(r => r.id === requestId);
      if (request) {
        return { collectionName: collection.name, requestName: request.name };
      }
    }

    return { collectionName: null, requestName: 'Untitled Request' };
  };

  const breadcrumbInfo = getBreadcrumbInfo();

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <span>Collections</span>
      {breadcrumbInfo.collectionName && (
        <>
          <span>›</span>
          <span>{breadcrumbInfo.collectionName}</span>
        </>
      )}
      <span>›</span>
      <span className="text-gray-900 font-medium">{breadcrumbInfo.requestName}</span>
    </div>
  );
}
