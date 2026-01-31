import { Dialog } from './Dialog';
import { EnvironmentManagerForm } from '../forms/EnvironmentManagerForm';
import { KeyboardShortcutsContent } from '../forms/KeyboardShortcutsContent';
import { NewCollectionForm } from '../forms/NewCollectionForm';
import { SaveRequestForm } from '../forms/SaveRequestForm';
import { NewRequestForm } from '../forms/NewRequestForm';
import { useUIStore } from '../store/useUIStore';
import { useEnvironmentStore } from '../store/useEnvironmentStore';
import { useCollectionsStore } from '../store/useCollectionsStore';
import { useTabsStore } from '../store/useTabsStore';

export const DialogManager = () => {
  const {
    isEnvironmentManagerOpen,
    isKeyboardShortcutsOpen,
    isNewCollectionOpen,
    isSaveRequestOpen,
    isNewRequestOpen,
    newRequestContext,
    closeAllDialogs,
  } = useUIStore();
  const { incrementEnvironmentCounter } = useEnvironmentStore();
  const { loadCollections } = useCollectionsStore();
  const { getActiveTab } = useTabsStore();
  
  const activeTab = getActiveTab();

  const handleEnvironmentChange = () => {
    incrementEnvironmentCounter();
  };

  const handleCollectionsChange = async () => {
    await loadCollections();
  };

  return (
    <>
      {isEnvironmentManagerOpen && (
        <Dialog isOpen={true} onClose={closeAllDialogs} title="Environment Variables" size="full">
          <EnvironmentManagerForm onEnvironmentChange={handleEnvironmentChange} />
        </Dialog>
      )}

      {isKeyboardShortcutsOpen && (
        <Dialog isOpen={true} onClose={closeAllDialogs} title="Keyboard Shortcuts" size="md">
          <KeyboardShortcutsContent onClose={closeAllDialogs} />
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
