import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, type FieldPath, type PathValue } from 'react-hook-form';
import type { Environment, EnvironmentVariable, EnvironmentVariableType } from '../store/environments/types';
import { useEnvironmentStore } from '../store/environments/store';
import { useAlertStore } from '../store/alert/store';

interface EnvironmentVariablesFormData {
  variables: EnvironmentVariable[];
}

// Shared editing logic for one environment's variables: form sync with dirty
// tracking, save (including sidecar current-value handling), per-row current
// value reset, rename, Ctrl+S, and state cleanup on close. Used by the
// environment manager and the runner's single-environment variables dialog.
export function useEnvironmentVariablesEditor(environment: Environment | null, isOpen: boolean) {
  const { saveEnvironment, updateEnvironment, updateCurrentValues, resetCurrentValues } = useEnvironmentStore();
  const { showAlert } = useAlertStore();
  const [hasChanges, setHasChanges] = useState(false);
  const lastSavedRef = useRef<string>('');
  const dirtyRef = useRef(false);
  const loadedEnvIdRef = useRef<string | null>(null);

  const form = useForm<EnvironmentVariablesFormData>({
    defaultValues: { variables: [] },
  });

  const { control, reset, watch, getValues, setValue } = form;

  // Sync form with the environment's variables and snapshot the saved state.
  // Clone the rows so the form never mutates the store's arrays.
  useEffect(() => {
    if (!environment) return;
    if (dirtyRef.current && loadedEnvIdRef.current === environment.id) return;
    loadedEnvIdRef.current = environment.id;
    reset({ variables: (environment.variables ?? []).map(v => ({ ...v })) });
    lastSavedRef.current = JSON.stringify(environment.variables ?? []);
    setHasChanges(false);
    dirtyRef.current = false;
  }, [environment, reset]);

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
    if (!environment) return;
    const formData = getValues();
    const variables = formData.variables;

    // Keys whose sidecar override must not survive this save: the variable
    // row was deleted, or its current value was blanked. Without this, the
    // override resurrects the variable (as an empty read-back entry) on the
    // next load, even after an app restart.
    const staleKeys = (environment.variables ?? [])
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
      // Reset stale overrides before the reload `saveEnvironment` triggers,
      // so the sidecar merge cannot resurrect them in memory.
      await Promise.all(staleKeys.map(key => resetCurrentValues(environment.id, key)));
      await saveEnvironment({ ...environment, variables });
      await updateCurrentValues(environment.id, overrides, types);

      lastSavedRef.current = JSON.stringify(variables);
      setHasChanges(false);
      dirtyRef.current = false;
      loadedEnvIdRef.current = null; // let the next store update re-sync the form
      showAlert('Environment saved', 'success');
    } catch {
      showAlert('Failed to save environment', 'error');
    }
  }, [environment, getValues, saveEnvironment, updateCurrentValues, resetCurrentValues, showAlert]);

  const handleNameChange = useCallback(
    async (newName: string) => {
      if (!environment) return;
      try {
        updateEnvironment({ ...environment, name: newName });
        await saveEnvironment({ ...environment, name: newName });
      } catch {
        showAlert('Failed to rename environment', 'error');
      }
    },
    [environment, updateEnvironment, saveEnvironment, showAlert]
  );

  // Clear the row's current value in the form too, so the editor reflects the
  // reset even while the form has other unsaved edits.
  const handleResetCurrentValue = useCallback(
    (key: string) => {
      if (!environment) return;
      void resetCurrentValues(environment.id, key);
      const idx = getValues().variables.findIndex(v => v.key === key);
      if (idx >= 0) {
        setValue(
          `variables.${idx}.currentValue` as FieldPath<EnvironmentVariablesFormData>,
          '' as PathValue<EnvironmentVariablesFormData, FieldPath<EnvironmentVariablesFormData>>,
        );
      }
    },
    [environment, resetCurrentValues, getValues, setValue]
  );

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && environment) {
          void handleSave();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasChanges, environment, handleSave]);

  // Reset change state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setHasChanges(false);
      dirtyRef.current = false;
      loadedEnvIdRef.current = null;
      lastSavedRef.current = '';
    }
  }, [isOpen]);

  return { control, setValue, hasChanges, handleSave, handleNameChange, handleResetCurrentValue };
}
