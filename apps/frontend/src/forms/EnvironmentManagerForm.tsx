import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Environment, EnvironmentVariable, EnvironmentsData } from '../store/useEnvironmentStore';
import { getEnvironments, saveEnvironment as apiSaveEnvironment, deleteEnvironment as apiDeleteEnvironment, setActiveEnvironment as apiSetActiveEnvironment } from '../helpers/api';
import { Button } from '../components/Button';

interface EnvironmentManagerFormProps {
  onEnvironmentChange: () => void;
}

export const EnvironmentManagerForm: React.FC<EnvironmentManagerFormProps> = ({ onEnvironmentChange }) => {
  const [environmentsData, setEnvironmentsData] = useState<EnvironmentsData>({ 
    activeEnvironmentId: null, 
    environments: [] 
  });
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');

  useEffect(() => {
    loadEnvironments();
  }, []);

  const loadEnvironments = async () => {
    try {
      const data = await getEnvironments();
      setEnvironmentsData(data);
      if (data.environments.length > 0 && !selectedEnvId) {
        setSelectedEnvId(data.activeEnvironmentId || data.environments[0].id);
      }
    } catch (error) {
      console.error('Failed to load environments:', error);
    }
  };

  const saveEnvironment = async (env: Environment) => {
    try {
      await apiSaveEnvironment(env);
      await loadEnvironments();
      setEditingEnv(null);
      onEnvironmentChange();
    } catch (error) {
      console.error('Failed to save environment:', error);
    }
  };

  const deleteEnvironment = async (id: string) => {
    if (!confirm('Delete this environment?')) return;
    
    try {
      await apiDeleteEnvironment(id);
      await loadEnvironments();
      if (selectedEnvId === id) {
        setSelectedEnvId(environmentsData.environments[0]?.id || null);
      }
      onEnvironmentChange();
    } catch (error) {
      console.error('Failed to delete environment:', error);
    }
  };

  const setActiveEnvironment = async (id: string) => {
    try {
      await apiSetActiveEnvironment(id);
      await loadEnvironments();
      onEnvironmentChange();
    } catch (error) {
      console.error('Failed to set active environment:', error);
    }
  };

  const createNewEnvironment = () => {
    setEditingEnv({
      id: Date.now().toString(),
      name: 'New Environment',
      variables: [{ key: '', value: '', enabled: true }],
    });
  };

  const selectedEnvironment = environmentsData.environments.find(e => e.id === selectedEnvId);

  const startEditing = () => {
    if (selectedEnvironment) {
      setEditingEnv({ ...selectedEnvironment });
    }
  };

  const updateEditingVariable = (index: number, field: keyof EnvironmentVariable, value: string | boolean) => {
    if (!editingEnv) return;
    const newVars = [...editingEnv.variables];
    newVars[index] = { ...newVars[index], [field]: value };
    setEditingEnv({ ...editingEnv, variables: newVars });
  };

  const addVariable = () => {
    if (!editingEnv) return;
    setEditingEnv({
      ...editingEnv,
      variables: [...editingEnv.variables, { key: '', value: '', enabled: true }],
    });
  };

  const removeVariable = (index: number) => {
    if (!editingEnv || editingEnv.variables.length === 1) return;
    const newVars = editingEnv.variables.filter((_, i) => i !== index);
    setEditingEnv({ ...editingEnv, variables: newVars });
  };

  const handleJsonEdit = (value: string | undefined) => {
    if (!editingEnv || !value) return;
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        setEditingEnv({ ...editingEnv, variables: parsed });
      }
    } catch (error) {
      // Invalid JSON, ignore
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 border-r bg-gray-50 p-4 overflow-y-auto">
        <Button
          onClick={createNewEnvironment}
          variant="primary"
          size="md"
          className="w-full mb-4 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Environment
        </Button>

        <div className="space-y-1">
          {environmentsData.environments.map(env => (
            <div
              key={env.id}
              className={`p-3 rounded cursor-pointer flex items-center justify-between group ${
                selectedEnvId === env.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
              }`}
              onClick={() => setSelectedEnvId(env.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{env.name}</div>
                <div className="text-xs text-gray-500">{env.variables.length} variables</div>
              </div>
              {environmentsData.activeEnvironmentId === env.id && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Active</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {editingEnv ? (
          // Edit Mode
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Environment Name</label>
              <input
                type="text"
                value={editingEnv.name}
                onChange={(e) => setEditingEnv({ ...editingEnv, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Variables</h3>
              <div className="flex gap-2">
                <Button
                  onClick={() => setViewMode(viewMode === 'table' ? 'json' : 'table')}
                  variant="secondary"
                  size="sm"
                >
                  {viewMode === 'table' ? 'JSON View' : 'Table View'}
                </Button>
                <Button
                  onClick={() => {
                    setEditingEnv(null);
                  }}
                  variant="ghost"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => saveEnvironment(editingEnv)}
                  variant="primary"
                  size="sm"
                >
                  Save
                </Button>
              </div>
            </div>

            {viewMode === 'table' ? (
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-2">
                  {editingEnv.variables.map((variable, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="checkbox"
                        checked={variable.enabled}
                        onChange={(e) => updateEditingVariable(index, 'enabled', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <input
                        type="text"
                        value={variable.key}
                        onChange={(e) => updateEditingVariable(index, 'key', e.target.value)}
                        placeholder="Variable name"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <input
                        type="text"
                        value={variable.value}
                        onChange={(e) => updateEditingVariable(index, 'value', e.target.value)}
                        placeholder="Value"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <button
                        onClick={() => removeVariable(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                        disabled={editingEnv.variables.length === 1}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addVariable}
                  className="mt-4 text-sm text-blue-600 hover:text-blue-700"
                >
                  + Add Variable
                </button>
              </div>
            ) : (
              <div className="flex-1 border border-gray-300 rounded-md overflow-hidden">
                <Editor
                  height="100%"
                  defaultLanguage="json"
                  value={JSON.stringify(editingEnv.variables, null, 2)}
                  onChange={handleJsonEdit}
                  theme="vs-light"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    automaticLayout: true,
                    tabSize: 2,
                  }}
                />
              </div>
            )}
          </div>
        ) : selectedEnvironment ? (
          // View Mode
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold">{selectedEnvironment.name}</h3>
                <p className="text-sm text-gray-500">{selectedEnvironment.variables.length} variables</p>
              </div>
              <div className="flex gap-2">
                {environmentsData.activeEnvironmentId !== selectedEnvironment.id && (
                  <Button
                    onClick={() => setActiveEnvironment(selectedEnvironment.id)}
                    variant="primary"
                    size="md"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Set as Active
                  </Button>
                )}
                <Button
                  onClick={startEditing}
                  variant="primary"
                  size="md"
                >
                  Edit
                </Button>
                <Button
                  onClick={() => deleteEnvironment(selectedEnvironment.id)}
                  variant="danger"
                  size="md"
                  disabled={environmentsData.environments.length === 1}
                >
                  Delete
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variable</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedEnvironment.variables.map((variable, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded ${
                          variable.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {variable.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm">{variable.key}</td>
                      <td className="px-6 py-4 font-mono text-sm text-gray-600">{variable.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p>Select an environment or create a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
