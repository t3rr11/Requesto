import { Dialog } from './Dialog';
import { NewCollectionForm } from '../forms/NewCollectionForm';
import { SaveRequestForm } from '../forms/SaveRequestForm';
import { NewRequestForm } from '../forms/NewRequestForm';
import { useUIStore } from '../store/useUIStore';
import { useCollectionsStore } from '../store/useCollectionsStore';
import { useTabsStore } from '../store/useTabsStore';
import { HelpContent } from './HelpContent';

export const DialogManager = () => {
  const {
    isHelpOpen,
    isNewCollectionOpen,
    isSaveRequestOpen,
    isNewRequestOpen,
    newRequestContext,
    closeAllDialogs,
  } = useUIStore();
  const { loadCollections } = useCollectionsStore();
  const { getActiveTab } = useTabsStore();
  
  const activeTab = getActiveTab();

  const handleCollectionsChange = async () => {
    await loadCollections();
  };

  return (
    <>
      {isHelpOpen && (
        <Dialog isOpen={true} onClose={closeAllDialogs} title="Help" size="md">
          <HelpContent onClose={closeAllDialogs} />
        </Dialog>
      )}

      <NewCollectionForm 
        isOpen={isNewCollectionOpen}
        onClose={closeAllDialogs}
        onSuccess={handleCollectionsChange}
      />

      <SaveRequestForm
        isOpen={isSaveRequestOpen}
        onClose={closeAllDialogs}
        onSuccess={handleCollectionsChange}
        currentRequest={activeTab ? {
          method: activeTab.request.method,
          url: activeTab.request.url,
          headers: activeTab.request.headers,
          body: activeTab.request.body,
        } : null}
      />

      <NewRequestForm
        isOpen={isNewRequestOpen}
        onClose={closeAllDialogs}
        onSuccess={handleCollectionsChange}
        preselectedCollectionId={newRequestContext?.collectionId}
        preselectedFolderId={newRequestContext?.folderId}
      />
    </>
  );
};
