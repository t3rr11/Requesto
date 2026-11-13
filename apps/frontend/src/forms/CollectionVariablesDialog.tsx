import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, type FieldPath, type PathValue } from 'react-hook-form';
import type { Collection } from '../store/collections/types';
import type { EnvironmentVariable, EnvironmentVariableType } from '../store/environments/types';
import { useCollectionsStore } from '../store/collections/store';
import { useAlertStore } from '../store/alert/store';
import { Dialog } from '../components/Dialog';
import { VariableEditor } from '../components/VariableEditor';

interface CollectionVariablesFormData {
  variables: EnvironmentVariable[];
}

interface CollectionVariablesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  collection: Collection;
}

export function CollectionVariablesDialog({ isOpen, onClose, collection }: Readonly<CollectionVariablesDialogProps>) {
  const { updateCollection, updateCollectionCurrentValues, resetCollectionCurrentValue } = useCollectionsStore();
  const { showAlert } = useAlertStore();
  const [hasChanges, setHasChanges] = useState(false);
  const lastSavedRef = useRef<string>('');
  const dirtyRef = useRef(false);
  const loadedCollectionIdRef = useRef<string | null>(null);

  const form = useForm<CollectionVariablesFormData>({
    defaultValues: { variables: [] },
  });

  const { control, reset, watch, getValues, setValue } = form;

  // Sync form with the collection's variables and snapshot the saved state.
  // Clone the rows so the form never mutates the store's arrays.
  useEffect(() => {
    if (dirtyRef.current && loadedCollectionIdRef.current === collection.id) return;
    loadedCollectionIdRef.current = collection.id;
    reset({ variables: (collection.variables ?? []).map(v => ({ ...v })) });
    lastSavedRef.current = JSON.stringify(collection.variables ?? []);
    setHasChanges(false);
    dirtyRef.current = false;
  }, [collection, reset]);

  // Watch for real changes by comparing to saved snapshot
  useEffect(() => {
    const subscription = watch(formValues => {
      const current = JSON.stringify(formValues.variables ?? []);
      const dirty = current !== lastSavedRef.current;
      setHasChanges(dirty);
      dirtyRef.current = dirty;
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const handleSave = useCallback(async () => {
    const formData = getValues();
    const variables = formData.variables;

    // Keys whose sidecar override must not survive this save: the variable
    // row was deleted, or its current value was blanked. Without this, the
    // override resurrects the variable (as an empty read-back entry) on the
    // next load, even after an app restart.
    const staleKeys = (collection.variables ?? [])
      .filter(v => v.key && v.currentValue !== undefined && v.currentValue !== '')
      .map(v => v.key)
      .filter(key => {
        const row = variables.find(v => v.key === key);
        return !row || row.currentValue === undefined || row.currentValue === '';
      });

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
      // Reset stale overrides before the reload `updateCollection` triggers,
      // so the sidecar merge cannot resurrect them in memory.
      await Promise.all(staleKeys.map(key => resetCollectionCurrentValue(collection.id, key)));
      await updateCollection(collection.id, { variables });
      await updateCollectionCurrentValues(collection.id, overrides, types);

      lastSavedRef.current = JSON.stringify(variables);
      setHasChanges(false);
      dirtyRef.current = false;
      loadedCollectionIdRef.current = null; // let the next store update re-sync the form
      showAlert('Variables saved', 'success');
    } catch {
      showAlert('Failed to save collection variables', 'error');
    }
  }, [collection.id, collection.variables, getValues, updateCollection, updateCollectionCurrentValues, resetCollectionCurrentValue, showAlert]);

  // Clear the row's current value in the form too, so the editor reflects the
  // reset even while the form has other unsaved edits.
  const handleResetCurrentValue = useCallback(
    (key: string) => {
      void resetCollectionCurrentValue(collection.id, key);
      const idx = getValues().variables.findIndex(v => v.key === key);
      if (idx >= 0) {
        setValue(
          `variables.${idx}.currentValue` as FieldPath<CollectionVariablesFormData>,
          '' as PathValue<CollectionVariablesFormData, FieldPath<CollectionVariablesFormData>>,
        );
      }
    },
    [collection.id, resetCollectionCurrentValue, getValues, setValue]
  );

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges) {
          void handleSave();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasChanges, handleSave]);

  // Reset change state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setHasChanges(false);
      dirtyRef.current = false;
      loadedCollectionIdRef.current = null;
      lastSavedRef.current = '';
    }
  }, [isOpen]);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Collection Variables" size="full">
      <div className="flex h-[70vh] -m-6">
        <div className="flex-1 overflow-hidden flex flex-col min-w-0 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <h2
                className="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate"
                title={collection.name}
              >
                {collection.name}
              </h2>
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
