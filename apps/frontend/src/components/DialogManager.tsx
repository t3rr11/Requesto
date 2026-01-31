import { Dialog } from './Dialog';
import { EnvironmentManagerForm } from '../forms/EnvironmentManagerForm';
import { KeyboardShortcutsContent } from '../forms/KeyboardShortcutsContent';
import { NewCollectionForm } from '../forms/NewCollectionForm';
import { SaveRequestForm } from '../forms/SaveRequestForm';
import { NewRequestForm } from '../forms/NewRequestForm';
import { useUIStore } from '../store/useUIStore';
import { useEnvironmentStore } from '../store/useEnvironmentStore';
import { useCollectionsStore } from '../store/useCollectionsStore';
import { useRequestStore } from '../store/useRequestStore';

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
  const { currentSavedRequestId } = useRequestStore();

  const handleEnvironmentChange = () => {
    incrementEnvironmentCounter();
  };

  const handleCollectionsChange = async () => {
    await loadCollections();
  };

  // Get current request data from RequestBuilder if available
  const getCurrentRequestData = () => {
    // This would ideally be managed by a separate store
    // For now, we'll return null and handle it in the form
    return null;
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
        currentRequest={getCurrentRequestData()}
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
