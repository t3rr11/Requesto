/**
 * OAuth Configuration Management Page
 * Allows users to create, edit, and manage OAuth 2.0 configurations
 */

import { useState, useEffect } from 'react';
import { Shield, Plus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { OAuthConfig } from '../types';
import { useOAuthStore } from '../store/useOAuthStore';
import { useAlertStore } from '../store/useAlertStore';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { OAuthConfigForm } from '../forms/OAuthConfigForm';
import { OAuthConfigList } from '../components/OAuthConfigList';
import { useDialogWithData, useConfirmDialog } from '../hooks/useDialog';

export const OAuthPage = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlertStore();
  const { configs, loadConfigs, addConfig, updateConfig, deleteConfig, isLoadingConfigs } = useOAuthStore();
  
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const formDialog = useDialogWithData<OAuthConfig | undefined>();
  const confirmDialog = useConfirmDialog();

  useEffect(() => {
    loadConfigs();
  }, []);

  // Auto-select first config if none selected
  useEffect(() => {
    if (configs.length > 0 && !selectedConfigId) {
      setSelectedConfigId(configs[0].id);
    } else if (configs.length === 0) {
      setSelectedConfigId(null);
    }
  }, [configs.length, selectedConfigId]);

  const handleCreateNew = () => {
    formDialog.open(undefined); // undefined = create new
  };

  const handleEdit = (config: OAuthConfig) => {
    formDialog.open(config); // pass config for editing
  };

  const handleSave = async (configData: Omit<OAuthConfig, 'id' | 'createdAt' | 'updatedAt'> & { clientSecret?: string }) => {
    try {
      if (formDialog.data) {
        // Update existing config
        await updateConfig(formDialog.data.id, configData);
        showAlert('Success', 'OAuth configuration updated successfully', 'success');
      } else {
        // Create new config
        const newConfig = await addConfig(configData);
        setSelectedConfigId(newConfig.id);
        showAlert('Success', 'OAuth configuration created successfully', 'success');
      }
      formDialog.close();
    } catch (error) {
      console.error('Failed to save OAuth config:', error);
      showAlert('Error', 'Failed to save OAuth configuration', 'error');
      throw error;
    }
  };

  const handleDeleteClick = (id: string) => {
    const config = configs.find(c => c.id === id);
    if (config) {
      confirmDialog.open({
        title: 'Delete OAuth Configuration',
        message: `Are you sure you want to delete "${config.name}"? This action cannot be undone and will remove any associated tokens.`,
        confirmText: 'Delete',
        variant: 'danger',
        onConfirm: async () => {
          await handleDelete(id);
        },
      });
    }
  };

  const handleDelete = async (configId: string) => {
    try {
      await deleteConfig(configId);
      
      if (selectedConfigId === configId) {
        const remaining = configs.filter(c => c.id !== configId);
        setSelectedConfigId(remaining.length > 0 ? remaining[0].id : null);
      }
      
      showAlert('Success', 'OAuth configuration deleted successfully', 'success');
      formDialog.close(); // Close form dialog if open
    } catch (error) {
      console.error('Failed to delete OAuth config:', error);
      showAlert('Error', 'Failed to delete OAuth configuration', 'error');
      throw error;
    }
  };

  const selectedConfig = configs.find(c => c.id === selectedConfigId);

  return (
    <main className="overflow-hidden relative w-full h-full">
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" />
                <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">OAuth 2.0 Configurations</h1>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage OAuth authentication providers for secure API access
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleCreateNew} variant="primary" size="sm" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Configuration
              </Button>
              <Button onClick={() => navigate('/requests')} variant="secondary" size="sm">
                Close
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* OAuth Config List */}
          <OAuthConfigList
            configs={configs}
            selectedConfigId={selectedConfigId}
            isLoadingConfigs={isLoadingConfigs}
            onConfigSelect={(config) => setSelectedConfigId(config.id)}
          />

          {/* OAuth Config Details */}
          <div className="flex-1 overflow-hidden flex flex-col min-w-0">
            {selectedConfig ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Config Header */}
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {selectedConfig.name}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {selectedConfig.provider === 'custom' 
                          ? 'Custom OAuth Provider' 
                          : `${selectedConfig.provider.charAt(0).toUpperCase() + selectedConfig.provider.slice(1)} OAuth`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        onClick={() => handleEdit(selectedConfig)} 
                        variant="secondary" 
                        size="sm"
                      >
                        Edit
                      </Button>
                      <Button 
                        onClick={() => handleDeleteClick(selectedConfig.id)} 
                        variant="danger" 
                        size="sm"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Config Details */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="max-w-3xl space-y-6">
                    {/* Basic Info */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        Basic Information
                      </h3>
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                        <div className="px-4 py-3 grid grid-cols-3 gap-4">
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Provider</div>
                          <div className="col-span-2 text-sm text-gray-900 dark:text-gray-100">
                            {selectedConfig.provider === 'custom' ? 'Custom' : selectedConfig.provider}
                          </div>
                        </div>
                        <div className="px-4 py-3 grid grid-cols-3 gap-4">
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Flow Type</div>
                          <div className="col-span-2 text-sm text-gray-900 dark:text-gray-100">
                            {selectedConfig.flowType === 'authorization-code-pkce' ? 'Authorization Code (PKCE)' : 
                             selectedConfig.flowType === 'authorization-code' ? 'Authorization Code' :
                             selectedConfig.flowType === 'client-credentials' ? 'Client Credentials' :
                             selectedConfig.flowType === 'implicit' ? 'Implicit' : 
                             selectedConfig.flowType === 'password' ? 'Password' : selectedConfig.flowType}
                          </div>
                        </div>
                        <div className="px-4 py-3 grid grid-cols-3 gap-4">
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Client ID</div>
                          <div className="col-span-2 text-sm text-gray-900 dark:text-gray-100 font-mono break-all">
                            {selectedConfig.clientId}
                          </div>
                        </div>
                        {selectedConfig.scopes.length > 0 && (
                          <div className="px-4 py-3 grid grid-cols-3 gap-4">
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Scopes</div>
                            <div className="col-span-2">
                              <div className="flex flex-wrap gap-1">
                                {selectedConfig.scopes.map((scope, idx) => (
                                  <span 
                                    key={idx}
                                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                                  >
                                    {scope}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* OAuth Endpoints */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        OAuth Endpoints
                      </h3>
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                        <div className="px-4 py-3">
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Authorization URL
                          </div>
                          <div className="text-sm text-gray-900 dark:text-gray-100 font-mono break-all">
                            {selectedConfig.authorizationUrl}
                          </div>
                        </div>
                        <div className="px-4 py-3">
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Token URL
                          </div>
                          <div className="text-sm text-gray-900 dark:text-gray-100 font-mono break-all">
                            {selectedConfig.tokenUrl}
                          </div>
                        </div>
                        {selectedConfig.revocationUrl && (
                          <div className="px-4 py-3">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              Revocation URL
                            </div>
                            <div className="text-sm text-gray-900 dark:text-gray-100 font-mono break-all">
                              {selectedConfig.revocationUrl}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Configuration */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        Configuration
                      </h3>
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                        <div className="px-4 py-3 grid grid-cols-3 gap-4">
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">PKCE</div>
                          <div className="col-span-2 text-sm text-gray-900 dark:text-gray-100">
                            {selectedConfig.usePKCE ? 'Enabled' : 'Disabled'}
                          </div>
                        </div>
                        <div className="px-4 py-3 grid grid-cols-3 gap-4">
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Token Storage</div>
                          <div className="col-span-2 text-sm text-gray-900 dark:text-gray-100 capitalize">
                            {selectedConfig.tokenStorage}
                          </div>
                        </div>
                        <div className="px-4 py-3 grid grid-cols-3 gap-4">
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Auth Method</div>
                          <div className="col-span-2 text-sm text-gray-900 dark:text-gray-100">
                            {selectedConfig.usePopup ? 'Popup Window' : 'Full Redirect'}
                          </div>
                        </div>
                        <div className="px-4 py-3 grid grid-cols-3 gap-4">
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Auto Refresh</div>
                          <div className="col-span-2 text-sm text-gray-900 dark:text-gray-100">
                            {selectedConfig.autoRefreshToken ? `Enabled (${selectedConfig.tokenRefreshThreshold}s threshold)` : 'Disabled'}
                          </div>
                        </div>
                        {selectedConfig.redirectUri && (
                          <div className="px-4 py-3 grid grid-cols-3 gap-4">
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Redirect URI</div>
                            <div className="col-span-2 text-sm text-gray-900 dark:text-gray-100 font-mono break-all">
                              {selectedConfig.redirectUri}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        Metadata
                      </h3>
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                        <div className="px-4 py-3 grid grid-cols-3 gap-4">
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</div>
                          <div className="col-span-2 text-sm text-gray-900 dark:text-gray-100">
                            {new Date(selectedConfig.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="px-4 py-3 grid grid-cols-3 gap-4">
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</div>
                          <div className="col-span-2 text-sm text-gray-900 dark:text-gray-100">
                            {new Date(selectedConfig.updatedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Empty state
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No Configuration Selected
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Create your first OAuth configuration to authenticate with secure APIs using industry-standard OAuth 2.0
                  </p>
                  <Button onClick={handleCreateNew} variant="primary" size="md" className="flex items-center gap-2 mx-auto">
                    <Plus className="w-4 h-4" />
                    Create OAuth Configuration
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* OAuth Config Form Dialog */}
        <OAuthConfigForm
          isOpen={formDialog.isOpen}
          onClose={formDialog.close}
          onSave={handleSave}
          onDelete={formDialog.data ? () => handleDeleteClick(formDialog.data!.id) : undefined}
          editConfig={formDialog.data}
        />

        {/* Confirm Delete Dialog */}
        <ConfirmDialog {...confirmDialog.props} />
      </div>
    </main>
  );
};
