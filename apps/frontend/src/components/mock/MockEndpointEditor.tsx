import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Save, RotateCcw, AlertTriangle, Trash2, Plus } from 'lucide-react';
import { Button } from '../Button';
import type { KeyValueRow } from '../KeyValueEditor';
import { TabStrip } from '../TabStrip';
import { MockDataPane } from './MockDataPane';
import { MockModeToggle } from './MockModeToggle';
import { CopyUrlButton } from './CopyUrlButton';
import { DynamicRoutesInfo } from './DynamicRoutesInfo';
import { StaticResponseFields } from './StaticResponseFields';
import { useMockStore } from '../../store/mock/store';
import { useAlertStore } from '../../store/alert/store';
import { useResizablePanel } from '../../hooks/useResizablePanel';
import { useUIStore } from '../../store/ui/store';
import type { MockEndpoint, MockHttpMethod, MockStaticResponse } from '../../store/mock/types';
import {
  MOCK_METHOD_ORDER,
  createDefaultStaticResponse,
  endpointSignature,
  endpointToHeaderRows,
  firstConfiguredMethod,
  headersToRows,
  rowsToHeaders,
  type MockHeaderRows,
} from '../../helpers/mock';

const URL_BAR_STRIP_CLASS =
  'bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 py-3.5 shrink-0';

interface MockEndpointEditorProps {
  endpoint: MockEndpoint;
}

export function MockEndpointEditor({ endpoint }: Readonly<MockEndpointEditorProps>) {
  const { updateEndpoint } = useMockStore();
  const serverUrl = useMockStore(s => s.status.url);
  const { showAlert } = useAlertStore();
  const { panelLayout, requestPanelWidth, requestPanelHeight, setRequestPanelWidth, setRequestPanelHeight } =
    useUIStore();

  const [draft, setDraft] = useState<MockEndpoint>(endpoint);
  const [headerRows, setHeaderRows] = useState<MockHeaderRows>(() => endpointToHeaderRows(endpoint));
  const [activeMethod, setActiveMethod] = useState<MockHttpMethod>(() => firstConfiguredMethod(endpoint));
  const [isSaving, setIsSaving] = useState(false);
  const [recordsMissingId, setRecordsMissingId] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const isHorizontal = panelLayout === 'horizontal';
  const { isResizing, handleResizeStart } = useResizablePanel({
    containerRef,
    axis: isHorizontal ? 'horizontal' : 'vertical',
    onResize: isHorizontal ? setRequestPanelWidth : setRequestPanelHeight,
    min: isHorizontal ? 300 : 200,
    max: containerSize => containerSize - (isHorizontal ? 300 : 200),
  });

  const savedSignature = useMemo(() => endpointSignature(endpoint, endpointToHeaderRows(endpoint)), [endpoint]);
  const isDirty = endpointSignature(draft, headerRows) !== savedSignature;

  const resetDraft = (source: MockEndpoint) => {
    setDraft(source);
    setHeaderRows(endpointToHeaderRows(source));
    setActiveMethod(firstConfiguredMethod(source));
  };

  // Silent re-sync with the store when the draft is clean (post-save or external refresh).
  useEffect(() => {
    if (endpointSignature(draft, headerRows) === savedSignature) {
      setDraft(endpoint);
      setHeaderRows(endpointToHeaderRows(endpoint));
    }
  }, [savedSignature]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the tab valid when methods change; fall back to the first configured one
  useEffect(() => {
    if (draft.mode === 'static' && !draft.methods[activeMethod]) {
      setActiveMethod(firstConfiguredMethod(draft));
    }
  }, [draft, activeMethod]);

  const patchDraft = (updates: Partial<MockEndpoint>) => {
    setDraft(prev => ({ ...prev, ...updates }));
  };

  const handleAddMethod = (method: MockHttpMethod) => {
    setDraft(prev => ({
      ...prev,
      methods: { ...prev.methods, [method]: prev.methods[method] ?? createDefaultStaticResponse() },
    }));
    // Seed a placeholder header row so a fresh method has something to edit
    setHeaderRows(prev => (prev[method] ? prev : { ...prev, [method]: headersToRows({}) }));
    setActiveMethod(method);
  };

  const handleRemoveMethod = (method: MockHttpMethod) => {
    setDraft(prev => {
      const methods = { ...prev.methods };
      delete methods[method];
      return { ...prev, methods };
    });
  };

  const handleStaticResponseChange = (method: MockHttpMethod, updates: Partial<MockStaticResponse>) => {
    setDraft(prev => {
      const current = prev.methods[method];
      if (!current) return prev;
      return { ...prev, methods: { ...prev.methods, [method]: { ...current, ...updates } } };
    });
  };

  const handleHeaderRowsChange = (method: MockHttpMethod, rows: KeyValueRow[]) => {
    setHeaderRows(prev => ({ ...prev, [method]: rows }));
  };

  // Static configs are preserved even in dynamic mode so switching back restores them;
  // the mock server serves based on the endpoint mode and ignores them while dynamic.
  const buildMethods = (source: MockEndpoint): MockEndpoint['methods'] => {
    const methods: MockEndpoint['methods'] = {};
    for (const method of MOCK_METHOD_ORDER) {
      const staticResponse = source.methods[method];
      if (staticResponse) {
        methods[method] = { ...staticResponse, headers: rowsToHeaders(headerRows[method] ?? []) };
      }
    }
    return methods;
  };

  const handleSave = useCallback(async () => {
    if (!draft.name.trim()) {
      showAlert('Error', 'Endpoint name is required', 'error');
      return;
    }
    const methods = buildMethods(draft);
    if (draft.mode === 'static' && Object.keys(methods).length === 0) {
      showAlert('Error', 'At least one method must be configured', 'error');
      return;
    }

    setIsSaving(true);
    const success = await updateEndpoint(endpoint.id, {
      name: draft.name.trim(),
      path: draft.path,
      enabled: draft.enabled,
      mode: draft.mode,
      methods,
    });
    setIsSaving(false);
    if (!success) return;

    resetDraft({ ...draft, name: draft.name.trim(), methods });
    showAlert('Success', 'Endpoint saved', 'success');
  }, [draft, headerRows, endpoint.id, updateEndpoint, showAlert]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRevert = () => resetDraft(endpoint);

  // Ctrl/Cmd+S saves the endpoint like the request editor does
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (isDirty && !isSaving) void handleSave();
      }
    };
    // Capture phase so Monaco can't swallow the event
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isDirty, isSaving, handleSave]);

  const activeResponse = draft.methods[activeMethod];
  const configuredMethods = MOCK_METHOD_ORDER.filter(m => draft.methods[m]);
  const availableMethods = MOCK_METHOD_ORDER.filter(m => !draft.methods[m]);

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex ${isHorizontal ? 'flex-row' : 'flex-col'} min-h-0 overflow-hidden relative`}
    >
      <div
        className="flex flex-col overflow-hidden bg-white dark:bg-gray-900 relative"
        style={isHorizontal ? { width: `${requestPanelWidth}px` } : { height: `${requestPanelHeight}px` }}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700 h-14 shrink-0">
          <MockModeToggle mode={draft.mode} onChange={mode => patchDraft({ mode })} />
          <input
            type="text"
            value={draft.name}
            onChange={e => patchDraft({ name: e.target.value })}
            placeholder="Untitled Endpoint"
            className="flex-1 min-w-0 px-2 py-1 text-sm font-semibold bg-transparent border border-transparent rounded-md text-gray-900 dark:text-gray-100 hover:border-gray-200 dark:hover:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-2 shrink-0">
            {isDirty && (
              <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3 h-3" />
                <span>Unsaved changes</span>
              </div>
            )}
            <Button onClick={handleRevert} variant="ghost" size="sm" disabled={!isDirty || isSaving}>
              <RotateCcw className="w-4 h-4" />
              Revert
            </Button>
            <Button
              onClick={handleSave}
              variant="secondary"
              size="sm"
              loading={isSaving}
              disabled={!isDirty || isSaving}
            >
              <Save className="w-4 h-4" />
              Save
            </Button>
          </div>
        </div>

        <div className={URL_BAR_STRIP_CLASS}>
          <div className="flex items-center w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus-within:ring-1 focus-within:ring-blue-500">
            <span
              className={`pl-2 py-1.5 text-sm font-mono bg-transparent border-none text-gray-500 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none select-none shrink-0`}
              title="Mock server base URL"
            >
              {serverUrl}
            </span>
            <input
              type="text"
              value={draft.path}
              onChange={e => patchDraft({ path: e.target.value })}
              placeholder="/api/users"
              className={`flex-1 min-w-0 py-1.5 text-sm font-mono bg-transparent border-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none pl-0.5 pr-2`}
            />
            <CopyUrlButton url={serverUrl ? `${serverUrl}${draft.path}` : null} />
          </div>
        </div>

        {draft.mode === 'static' && (
          <TabStrip
            ariaLabel="Mock endpoint methods"
            tabs={configuredMethods.map(method => ({ key: method, label: method }))}
            activeKey={activeMethod}
            onSelect={method => setActiveMethod(method as MockHttpMethod)}
            trailing={availableMethods.map(method => (
              <button
                key={method}
                type="button"
                onClick={() => handleAddMethod(method)}
                title={`Add ${method}`}
                className="shrink-0 flex items-center gap-1 px-2 py-2 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <Plus className="w-3 h-3" />
                {method}
              </button>
            ))}
            actions={
              activeResponse && (
                <Button
                  onClick={() => handleRemoveMethod(activeMethod)}
                  variant="icon"
                  size="sm"
                  title={`Remove ${activeMethod}`}
                  className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )
            }
          />
        )}

        <div className="flex-1 overflow-y-auto">
          {draft.mode === 'dynamic' && (
            <div className="p-4">
              <DynamicRoutesInfo path={draft.path} recordsMissingId={recordsMissingId} />
            </div>
          )}

          {draft.mode !== 'dynamic' && activeResponse && (
            <StaticResponseFields
              response={activeResponse}
              headerRows={headerRows[activeMethod] ?? []}
              onResponseChange={updates => handleStaticResponseChange(activeMethod, updates)}
              onHeaderRowsChange={rows => handleHeaderRowsChange(activeMethod, rows)}
            />
          )}
        </div>
      </div>

      <button
        type="button"
        tabIndex={-1}
        aria-label="Resize panels"
        className={`${
          isHorizontal ? 'w-1 cursor-ew-resize!' : 'h-1 cursor-ns-resize!'
        } p-0 border-0 bg-gray-200 dark:bg-gray-700 hover:bg-orange-500 transition-colors ${isResizing ? 'bg-orange-500' : ''}`}
        onMouseDown={handleResizeStart}
      />

      <MockDataPane
        endpoint={draft}
        method={activeMethod}
        onStaticChange={handleStaticResponseChange}
        onMissingIdCountChange={setRecordsMissingId}
      />
    </div>
  );
}
