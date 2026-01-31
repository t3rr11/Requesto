import { useEffect } from 'react';
import { Header } from './components/Header';
import { MainLayout } from './components/layout/MainLayout';
import { DialogManager } from './components/DialogManager';
import { AlertDialog } from './components/AlertDialog';
import { useAlertStore } from './store/useAlertStore';
import { useCollectionsStore } from './store/useCollectionsStore';
import { useEnvironmentStore } from './store/useEnvironmentStore';

function App() {
  const { isOpen: isAlertOpen, title: alertTitle, message: alertMessage, variant: alertVariant, closeAlert } = useAlertStore();
  const { loadCollections } = useCollectionsStore();
  const { loadEnvironments } = useEnvironmentStore();

  // Load initial data
  useEffect(() => {
    loadCollections();
    loadEnvironments();
  }, []);

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <Header />
      <MainLayout />
      <DialogManager />
      
      <AlertDialog
        isOpen={isAlertOpen}
        onClose={closeAlert}
        title={alertTitle}
        message={alertMessage}
        variant={alertVariant}
      />
    </div>
  );
}

export default App;
