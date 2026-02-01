import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Check, Eye, EyeOff, Globe, Copy, ChevronLeft, AlertCircle, MoreVertical } from 'lucide-react';
import { Environment, useEnvironmentStore } from '../store/useEnvironmentStore';
import {
  getEnvironments,
  saveEnvironment as apiSaveEnvironment,
  deleteEnvironment as apiDeleteEnvironment,
  setActiveEnvironment as apiSetActiveEnvironment,
} from '../helpers/api';
import { Button } from '../components/Button';
import { useAlertStore } from '../store/useAlertStore';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useNavigate } from 'react-router';

// Validation schema
const environmentVariableSchema = z.object({
  key: z.string(),
  value: z.string(),
  enabled: z.boolean(),
  isSecret: z.boolean().optional(),
});

const environmentFormSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Environment name is required'),
  variables: z.array(environmentVariableSchema),
});

type EnvironmentFormData = z.infer<typeof environmentFormSchema>;

export const EnvironmentsPage = () => {
  const { environmentsData, setEnvironmentsData } = useEnvironmentStore();
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<number, boolean>>({});
  const [isEditingName, setIsEditingName] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const { showAlert } = useAlertStore();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const lastSavedValuesRef = useRef<string>('');
  const navigate = useNavigate();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EnvironmentFormData>({
    resolver: zodResolver(environmentFormSchema),
    defaultValues: {
      id: '',
      name: '',
      variables: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variables',
  });

  const formValues = watch();

  useEffect(() => {
    loadEnvironments();
  }, []);

  // Auto-save when form values change
  useEffect(() => {
    if (selectedEnvId && formValues.name) {
      // Serialize current form values to compare with last saved
      const currentValues = JSON.stringify({
        id: formValues.id,
        name: formValues.name,
        variables: formValues.variables,
      });

      // Only trigger auto-save if values actually changed
      if (currentValues !== lastSavedValuesRef.current) {
        // Clear existing timeout
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        // Set new timeout for auto-save
        saveTimeoutRef.current = setTimeout(() => {
          autoSave();
        }, 1000); // 1 second debounce

        return () => {
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
          }
        };
      }
    }
  }, [formValues, selectedEnvId]);

  // Focus name input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const loadEnvironments = async () => {
    try {
      const data = await getEnvironments();
      setEnvironmentsData(data);

      // Auto-select first environment if none selected
      if (data.environments.length > 0 && !selectedEnvId) {
        const envToSelect = data.activeEnvironmentId
          ? data.environments.find(e => e.id === data.activeEnvironmentId)
          : data.environments[0];

        if (envToSelect) {
          setSelectedEnvId(envToSelect.id);
          const initialData = {
            id: envToSelect.id,
            name: envToSelect.name,
            variables: envToSelect.variables.length > 0 ? envToSelect.variables : [],
          };
          reset(initialData);
          lastSavedValuesRef.current = JSON.stringify(initialData);
        }
      }
    } catch (error) {
      console.error('Failed to load environments:', error);
    }
  };

  const autoSave = async () => {
    if (!formValues.name.trim()) return;

    try {
      setIsSaving(true);
      const environment: Environment = {
        id: formValues.id,
        name: formValues.name.trim(),
        variables: formValues.variables.filter(v => v.key.trim() !== ''),
      };

      await apiSaveEnvironment(environment);

      // Update last saved values to prevent re-triggering
      lastSavedValuesRef.current = JSON.stringify({
        id: environment.id,
        name: environment.name,
        variables: environment.variables,
      });

      // Update local state without full reload
      const existingIndex = environmentsData.environments.findIndex(e => e.id === environment.id);
      if (existingIndex >= 0) {
        const updated = [...environmentsData.environments];
        updated[existingIndex] = environment;
        setEnvironmentsData({ ...environmentsData, environments: updated });
      } else {
        setEnvironmentsData({ ...environmentsData, environments: [...environmentsData.environments, environment] });
      }
    } catch (error) {
      console.error('Failed to auto-save environment:', error);
      showAlert('Save Failed', 'Failed to save environment. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = async () => {
    // Manual save (used on blur or enter)
    await autoSave();
  };

  const handleDeleteClick = (id: string) => {
    const env = environmentsData.environments.find(e => e.id === id);
    if (env) {
      setConfirmDelete({ id, name: env.name });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    setConfirmDelete(null);

    try {
      await apiDeleteEnvironment(id);

      // Update local state
      const remaining = environmentsData.environments.filter(e => e.id !== id);
      setEnvironmentsData({
        ...environmentsData,
        environments: remaining,
        activeEnvironmentId: environmentsData.activeEnvironmentId === id ? null : environmentsData.activeEnvironmentId,
      });

      if (selectedEnvId === id) {
        if (remaining.length > 0) {
          const nextEnv = remaining[0];
          setSelectedEnvId(nextEnv.id);
          const nextEnvData = {
            id: nextEnv.id,
            name: nextEnv.name,
            variables: nextEnv.variables.length > 0 ? nextEnv.variables : [],
          };
          reset(nextEnvData);
          lastSavedValuesRef.current = JSON.stringify(nextEnvData);
        } else {
          setSelectedEnvId(null);
          lastSavedValuesRef.current = '';
        }
      }
    } catch (error) {
      console.error('Failed to delete environment:', error);
      showAlert('Delete Failed', 'Failed to delete environment. Please try again.', 'error');
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      await apiSetActiveEnvironment(id);
      setEnvironmentsData({
        ...environmentsData,
        activeEnvironmentId: id,
      });
    } catch (error) {
      console.error('Failed to set active environment:', error);
      showAlert('Activation Failed', 'Failed to set active environment. Please try again.', 'error');
    }
  };

  const createNewEnvironment = () => {
    const newId = `env-${Date.now()}`;
    const newEnv = {
      id: newId,
      name: 'New Environment',
      variables: [],
    };

    reset(newEnv);
    // Set to current state to prevent immediate auto-save, will save when name is edited
    lastSavedValuesRef.current = JSON.stringify(newEnv);
    setSelectedEnvId(newId);
    setIsEditingName(true);
  };

  const duplicateEnvironment = () => {
    if (!selectedEnvId) return;

    const env = environmentsData.environments.find(e => e.id === selectedEnvId);
    if (!env) return;

    const newId = `env-${Date.now()}`;
    const duplicated = {
      id: newId,
      name: `${env.name} Copy`,
      variables: env.variables.map(v => ({ ...v })),
    };

    reset(duplicated);
    // Set to current state to prevent immediate auto-save, will save when name is edited
    lastSavedValuesRef.current = JSON.stringify(duplicated);
    setSelectedEnvId(newId);
    setIsEditingName(true);
    setShowMenu(false);
  };

  const handleEnvironmentSelect = (env: Environment) => {
    setSelectedEnvId(env.id);
    setIsEditingName(false);
    const envData = {
      id: env.id,
      name: env.name,
      variables: env.variables.length > 0 ? env.variables : [],
    };
    reset(envData);
    lastSavedValuesRef.current = JSON.stringify(envData);
  };

  const toggleSecretVisibility = (index: number) => {
    setShowSecrets(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const selectedEnvironment = environmentsData.environments.find(e => e.id === selectedEnvId);
  const isActive = environmentsData.activeEnvironmentId === selectedEnvId;
  const isNewEnvironment = selectedEnvId && !environmentsData.environments.find(e => e.id === selectedEnvId);

  return (
    <main className="overflow-hidden relative w-full h-full">
      <div className="h-full flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/requests')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Requests"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Environments</h1>
                <p className="text-sm text-gray-500">Manage variables across different environments</p>
              </div>
            </div>

            <Button onClick={createNewEnvironment} variant="primary" size="md" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Environment
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* Environments List */}
          <div className="w-72 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Environments</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {environmentsData.environments.length === 0 && !isNewEnvironment && (
                <div className="text-center py-12 px-4">
                  <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-500">No environments yet</p>
                  <p className="text-xs text-gray-400 mt-1">Create one to get started</p>
                </div>
              )}

              {environmentsData.environments.map(env => (
                <button
                  key={env.id}
                  onClick={() => handleEnvironmentSelect(env)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                    selectedEnvId === env.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{env.name}</span>
                        {environmentsData.activeEnvironmentId === env.id && (
                          <span className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full" title="Active" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {env.variables.length} {env.variables.length === 1 ? 'variable' : 'variables'}
                      </div>
                    </div>
                  </div>
                </button>
              ))}

              {/* Show new environment in list */}
              {isNewEnvironment && (
                <div className="px-3 py-2.5 rounded-lg bg-blue-50 border-2 border-blue-200">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div className="text-sm">
                      <div className="font-medium text-blue-700">New Environment</div>
                      <div className="text-xs text-blue-600">Not saved yet</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Environment Details */}
          <div className="flex-1 overflow-hidden flex flex-col min-w-0">
            {selectedEnvId ? (
              <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
                {/* Environment Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {isEditingName ? (
                        <Controller
                          name="name"
                          control={control}
                          render={({ field }) => (
                            <input
                              {...field}
                              ref={nameInputRef}
                              type="text"
                              placeholder="Environment name"
                              className="text-2xl font-semibold px-2 py-1 -ml-2 border-2 border-blue-500 rounded focus:outline-none w-full"
                              onBlur={() => {
                                setIsEditingName(false);
                                autoSave();
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  setIsEditingName(false);
                                  autoSave();
                                }
                                if (e.key === 'Escape') {
                                  setIsEditingName(false);
                                  if (selectedEnvironment) {
                                    reset({
                                      id: selectedEnvironment.id,
                                      name: selectedEnvironment.name,
                                      variables: formValues.variables,
                                    });
                                  }
                                }
                              }}
                            />
                          )}
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <h2
                            onClick={() => setIsEditingName(true)}
                            className="text-2xl font-semibold text-gray-900 cursor-text hover:text-blue-600 transition-colors px-2 py-1 -ml-2 rounded hover:bg-gray-50"
                            title="Click to edit"
                          >
                            {formValues.name || 'Untitled Environment'}
                          </h2>
                          {isActive && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <Check className="w-3.5 h-3.5" />
                              Active
                            </span>
                          )}
                          {isSaving && <span className="text-xs text-gray-400 italic">Saving...</span>}
                        </div>
                      )}
                      {errors.name && <p className="text-red-500 text-sm mt-1 ml-2">{errors.name.message}</p>}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!isActive && (
                        <Button
                          type="button"
                          onClick={() => selectedEnvId && handleSetActive(selectedEnvId)}
                          variant="primary"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          Set Active
                        </Button>
                      )}

                      <div className="relative">
                        <Button
                          type="button"
                          onClick={() => setShowMenu(!showMenu)}
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>

                        {showMenu && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                              <button
                                type="button"
                                onClick={duplicateEnvironment}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Copy className="w-4 h-4" />
                                Duplicate
                              </button>
                              <div className="border-t border-gray-100 my-1" />
                              <button
                                type="button"
                                onClick={() => {
                                  setShowMenu(false);
                                  selectedEnvId && handleDeleteClick(selectedEnvId);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                disabled={environmentsData.environments.length === 1}
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Variables Section */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                  <div className="max-w-4xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Variables</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Reference with{' '}
                          <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">
                            {'{{'} name {'}}'}
                          </code>
                        </p>
                      </div>

                      <Button
                        type="button"
                        onClick={() => append({ key: '', value: '', enabled: true, isSecret: false })}
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        Add Variable
                      </Button>
                    </div>

                    {fields.length === 0 ? (
                      <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-200">
                        <AlertCircle className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                        <p className="text-sm text-gray-500 mb-4">No variables defined</p>
                        <Button
                          type="button"
                          onClick={() => append({ key: '', value: '', enabled: true, isSecret: false })}
                          variant="primary"
                          size="sm"
                          className="flex items-center gap-2 mx-auto"
                        >
                          <Plus className="w-4 h-4" />
                          Add Variable
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {fields.map((field, index) => (
                          <div
                            key={field.id}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              {/* Enable Toggle */}
                              <div className="pt-2">
                                <Controller
                                  name={`variables.${index}.enabled`}
                                  control={control}
                                  render={({ field }) => (
                                    <input
                                      type="checkbox"
                                      checked={field.value}
                                      onChange={field.onChange}
                                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                      title={field.value ? 'Enabled' : 'Disabled'}
                                    />
                                  )}
                                />
                              </div>

                              {/* Variable Fields */}
                              <div className="flex-1 grid grid-cols-2 gap-3">
                                {/* Variable Name */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Name</label>
                                  <Controller
                                    name={`variables.${index}.key`}
                                    control={control}
                                    render={({ field: inputField }) => (
                                      <input
                                        {...inputField}
                                        type="text"
                                        placeholder="variable_name"
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                                      />
                                    )}
                                  />
                                </div>

                                {/* Variable Value */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Value</label>
                                  <Controller
                                    name={`variables.${index}.value`}
                                    control={control}
                                    render={({ field: valueField }) => (
                                      <Controller
                                        name={`variables.${index}.isSecret`}
                                        control={control}
                                        render={({ field: secretField }) => (
                                          <div className="relative">
                                            <input
                                              {...valueField}
                                              type={secretField.value && !showSecrets[index] ? 'password' : 'text'}
                                              placeholder="value"
                                              className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                                            />
                                            {secretField.value && valueField.value && (
                                              <button
                                                type="button"
                                                onClick={() => toggleSecretVisibility(index)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                              >
                                                {showSecrets[index] ? (
                                                  <EyeOff className="w-4 h-4" />
                                                ) : (
                                                  <Eye className="w-4 h-4" />
                                                )}
                                              </button>
                                            )}
                                          </div>
                                        )}
                                      />
                                    )}
                                  />
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2 pt-7">
                                <Controller
                                  name={`variables.${index}.isSecret`}
                                  control={control}
                                  render={({ field }) => (
                                    <button
                                      type="button"
                                      onClick={() => field.onChange(!field.value)}
                                      className={`p-1.5 rounded transition-colors ${
                                        field.value
                                          ? 'bg-purple-100 text-purple-600'
                                          : 'text-gray-400 hover:bg-gray-100'
                                      }`}
                                      title={field.value ? 'Secret variable' : 'Mark as secret'}
                                    >
                                      <EyeOff className="w-4 h-4" />
                                    </button>
                                  )}
                                />

                                <button
                                  type="button"
                                  onClick={() => remove(index)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Remove variable"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </form>
            ) : (
              // Empty state
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-sm">
                  <Globe className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Environment Selected</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Create your first environment to manage variables across different deployment targets
                  </p>
                  <Button
                    onClick={createNewEnvironment}
                    variant="primary"
                    size="md"
                    className="flex items-center gap-2 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Create Environment
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Confirm Delete Dialog */}
        <ConfirmDialog
          isOpen={confirmDelete !== null}
          onClose={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
          title="Delete Environment"
          message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          variant="danger"
        />
      </div>
    </main>
  );
};
