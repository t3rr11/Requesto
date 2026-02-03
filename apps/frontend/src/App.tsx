import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Header } from './components/Header';
import { AlertDialog } from './components/AlertDialog';
import { useAlertStore } from './store/useAlertStore';
import { useCollectionsStore } from './store/useCollectionsStore';
import { useEnvironmentStore } from './store/useEnvironmentStore';
import { DialogManager } from './components/DialogManager';
import { RequestPage } from './pages/RequestsPage';
import { EnvironmentsPage } from './pages/EnvironmentsPage';
import { OAuthCallback } from './components/OAuthCallback';

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
    <BrowserRouter>
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
        <Header />
        
        <Routes>
          <Route path="/" element={<Navigate to="/requests" replace />} />
          <Route path="/requests" element={<RequestPage />} />
          <Route path="/environments" element={<EnvironmentsPage />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
        </Routes>

        <DialogManager />
        
        <AlertDialog
          isOpen={isAlertOpen}
          onClose={closeAlert}
          title={alertTitle}
          message={alertMessage}
          variant={alertVariant}
        />
      </div>
    </BrowserRouter>
  );
}

export default App;
