import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Folder as FolderIcon, Package } from 'lucide-react';
import type { Collection } from '../store/collections/types';
import type { EnvironmentVariable, EnvironmentVariableType } from '../store/environments/types';
import { useCollectionsStore } from '../store/collections/store';
import { useAlertStore } from '../store/alert/store';
import { Dialog } from '../components/Dialog';
import { VariableEditor } from '../components/VariableEditor';
import { SidebarPanel } from '../components/SidebarPanel';
import { SidebarItem } from '../components/SidebarItem';

interface CollectionVariablesFormData {
  variables: EnvironmentVariable[];
}

type VariableScope = {
  kind: 'collection' | 'folder';
  folderId?: string;
  name: string;
  depth: number;
  variables: EnvironmentVariable[];
};

interface CollectionVariablesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  collection: Collection;
}

/** Flattened folder list in tree order so parents appear above their children. */
function buildScopes(collection: Collection): VariableScope[] {
  const scopes: VariableScope[] = [
    { kind: 'collection', name: collection.name, depth: 0, variables: collection.variables ?? [] },
  ];
  const walk = (parentId: string | undefined, depth: number) => {
    (collection.folders || [])
      .filter(f => f.parentId === parentId)
      .forEach(folder => {
        scopes.push({
          kind: 'folder',
          folderId: folder.id,
          name: folder.name,
          depth,
          variables: folder.variables ?? [],
        });
        walk(folder.id, depth + 1);
      });
  };
  walk(undefined, 1);
  return scopes;
}

export function CollectionVariablesDialog({ isOpen, onClose, collection }: Readonly<CollectionVariablesDialogProps>) {
  const { updateCollection, updateFolder, updateCollectionCurrentValues, resetCollectionCurrentValue } =
    useCollectionsStore();
  const { showAlert } = useAlertStore();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const lastSavedRef = useRef<string>('');

  const scopes = useMemo(() => buildScopes(collection), [collection]);
  const selectedScope = useMemo(
    () => scopes.find(s => s.kind === 'folder' && s.folderId === selectedFolderId) ?? scopes[0],
    [scopes, selectedFolderId]
  );

  const form = useForm<CollectionVariablesFormData>({
    defaultValues: { variables: [] },
  });

  const { control, reset, watch, getValues, setValue } = form;

  // Auto-select the collection scope when it opens, and fall back to it if
  // the selected folder disappears (e.g. deleted while the dialog is open).
  useEffect(() => {
    if (!isOpen) return;
    if (selectedFolderId && collection.folders?.some(f => f.id === selectedFolderId)) return;
    setSelectedFolderId(null);
  }, [isOpen, collection.folders, selectedFolderId]);

  // Sync form with the selected scope and snapshot the saved state.
  // Clone the rows so the form never mutates the store's arrays.
  useEffect(() => {
    reset({ variables: selectedScope.variables.map(v => ({ ...v })) });
    lastSavedRef.current = JSON.stringify(selectedScope.variables);
    setHasChanges(false);
  }, [collection, selectedScope, reset]);

  // Watch for real changes by comparing to saved snapshot
  useEffect(() => {
    const subscription = watch(formValues => {
      const current = JSON.stringify(formValues.variables ?? []);
      setHasChanges(current !== lastSavedRef.current);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const handleSave = useCallback(async () => {
    if (!selectedScope) return;
    const formData = getValues();
    const variables = formData.variables;

    // Persist current-value overrides to the local sidecar.
    // Build a map of key -> currentValue for every variable that has one set,
    // plus the type each value should resolve as (the sidecar type wins over
    // the committed one when merging back in).
    const overrides: Record<string, string> = {};
    const types: Record<string, EnvironmentVariableType> = {};
    variables.forEach(v => {
      if (v.key && v.currentValue !== undefined && v.currentValue !== '') {
        overrides[v.key] = v.currentValue;
        types[v.key] = v.type ?? 'string';
      }
    });

    try {
      if (selectedScope.kind === 'folder' && selectedScope.folderId) {
        const folder = collection.folders.find(f => f.id === selectedScope.folderId);
        await updateFolder(collection.id, selectedScope.folderId, { ...folder, variables });
        await updateCollectionCurrentValues(collection.id, overrides, types, selectedScope.folderId);
      } else {
        await updateCollection(collection.id, { variables });
        await updateCollectionCurrentValues(collection.id, overrides, types);
      }

      lastSavedRef.current = JSON.stringify(variables);
      setHasChanges(false);
      showAlert('Variables saved', 'success');
    } catch {
      showAlert('Failed to save collection variables', 'error');
    }
  }, [collection, selectedScope, getValues, updateCollection, updateFolder, updateCollectionCurrentValues, showAlert]);

  const handleResetCurrentValue = useCallback(
    (key: string) => {
      void resetCollectionCurrentValue(collection.id, key, selectedFolderId ?? undefined);
    },
    [collection.id, selectedFolderId, resetCollectionCurrentValue]
  );

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && selectedScope) {
          void handleSave();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasChanges, selectedScope, handleSave]);

  // Reset selection state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFolderId(null);
      setHasChanges(false);
      lastSavedRef.current = '';
    }
  }, [isOpen]);

  const sidebar = (
    <SidebarPanel title="Scopes">
      <div className="py-1 space-y-2">
        {scopes.map(scope => (
          <SidebarItem
            key={scope.folderId ?? 'collection'}
            isSelected={selectedScope.folderId === scope.folderId}
            onClick={() => setSelectedFolderId(scope.folderId ?? null)}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="shrink-0" style={{ width: scope.depth * 12 }} />
              {scope.kind === 'folder' ? (
                <FolderIcon className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
              ) : (
                <Package className="w-4 h-4 text-orange-500 dark:text-orange-400 shrink-0" />
              )}
              <span className="text-sm truncate" title={scope.name}>
                {scope.name}
              </span>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {scope.variables.length} var{scope.variables.length !== 1 ? 's' : ''}
            </span>
          </SidebarItem>
        ))}
      </div>
    </SidebarPanel>
  );

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Collection Variables" size="full">
      <div className="flex h-[70vh] -m-6">
        <div className="shrink-0">{sidebar}</div>
        <div className="flex-1 overflow-hidden flex flex-col min-w-0 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <h2
                className="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate"
                title={selectedScope.name}
              >
                {selectedScope.name}
              </h2>
              {selectedScope.kind === 'folder' && (
                <span className="text-xs text-gray-500 dark:text-gray-400">folder variables</span>
              )}
              {hasChanges && <span className="text-xs text-amber-500 dark:text-amber-400">(unsaved)</span>}
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Save
                </button>
              )}
            </div>
          </div>
          <VariableEditor control={control} setValue={setValue} onResetCurrentValue={handleResetCurrentValue} />
        </div>
      </div>
    </Dialog>
  );
}
