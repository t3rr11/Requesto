import { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router';
import { useCollectionsStore } from './store/collections/store';
import { useEnvironmentStore } from './store/environments/store';
import { useThemeStore } from './store/theme/store';
import { useAlertStore } from './store/alert/store';
import { Header } from './components/Header';
import { AlertDialog } from './components/AlertDialog';
import { RequestsPage } from './pages/RequestsPage';
import { OAuthCallback } from './components/OAuthCallback';

function App() {
  const { loadCollections } = useCollectionsStore();
  const { loadEnvironments } = useEnvironmentStore();
  const { isDarkMode } = useThemeStore();
  const { isOpen: alertOpen, title: alertTitle, message: alertMessage, variant: alertVariant, closeAlert } = useAlertStore();

  useEffect(() => {
    loadCollections();
    loadEnvironments();
  }, [loadCollections, loadEnvironments]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  return (
    <HashRouter>
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-hidden flex flex-col">
          <Routes>
            <Route path="/" element={<RequestsPage />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />
          </Routes>
        </div>
        <AlertDialog
          isOpen={alertOpen}
          onClose={closeAlert}
          title={alertTitle}
          message={alertMessage}
          variant={alertVariant}
        />
      </div>
    </HashRouter>
  );
}

export default App;
