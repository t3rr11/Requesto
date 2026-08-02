import { useState, useEffect, useRef, ReactNode } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Editor, { type Monaco } from '@monaco-editor/react';
import { Button } from '../components/Button';
import { KeyValueEditor } from '../components/KeyValueEditor';
import { VariableAwareInput } from '../components/VariableAwareInput';
import { AuthEditor } from '../components/AuthEditor';
import { AlertTriangle, BookOpen, ChevronLeft, ChevronRight, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { AuthConfig, FormDataEntry } from '../store/request/types';
import { useThemeStore } from '../store/theme/store';
import { useTabsStore } from '../store/tabs/store';
import { extractParamsFromUrl } from '../helpers/url';
import { buildTabRequestFromFormData, getGraphQLOperations } from '../helpers/request';
import { parseCurlCommand } from '../helpers/curl';
import { useAlertStore } from '../store/alert/store';
import { requestFormSchema, type RequestFormData } from './schemas/requestFormSchema';
import { TEST_SCRIPT_TYPES, PRE_REQUEST_SCRIPT_TYPES } from '../helpers/scriptTypes';
import { GraphQLSchemaExplorer } from '../components/GraphQLSchemaExplorer';
import { GraphQLQueryEditor } from '../components/GraphQLQueryEditor';
import type { GraphQLSchema } from 'graphql';
import { Dialog } from '../components/Dialog';
import { useGraphQLSchemaManager } from '../hooks/useGraphQLSchemaManager';
import { Tooltip } from '../components/Tooltip';
import { GraphQLSchemaProfileForm } from './GraphQLSchemaProfileForm';
import { ConfirmDialog } from '../components/ConfirmDialog';

export { requestFormSchema, type RequestFormData } from './schemas/requestFormSchema';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
type RequestTab = 'params' | 'query' | 'variables' | 'auth' | 'headers' | 'body' | 'pre-request' | 'tests';

function getRequestTabs(requestType: 'http' | 'graphql'): RequestTab[] {
  return requestType === 'graphql'
    ? ['query', 'variables', 'auth', 'headers', 'pre-request', 'tests']
    : ['params', 'auth', 'headers', 'body', 'pre-request', 'tests'];
}

function defineEditorTheme(monaco: Monaco) {
  monaco.editor.defineTheme('custom-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#1f2937',
      'editor.lineHighlightBackground': '#374151',
      'editorLineNumber.foreground': '#6b7280',
      'editorLineNumber.activeForeground': '#9ca3af',
    },
  });
}

function createScriptEditorBeforeMount(typeLib: string, libFileName: string) {
  return (monaco: Monaco) => {
    defineEditorTheme(monaco);
    // noLib suppresses all browser/DOM globals so only our declared types appear
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      ...monaco.languages.typescript.javascriptDefaults.getCompilerOptions(),
      noLib: true,
    });
    monaco.languages.typescript.javascriptDefaults.addExtraLib(typeLib, libFileName);
  };
}

const beforeMountPreRequestEditor = createScriptEditorBeforeMount(
  PRE_REQUEST_SCRIPT_TYPES,
  'requesto-pre-request-globals.d.ts'
);
const beforeMountTestEditor = createScriptEditorBeforeMount(TEST_SCRIPT_TYPES, 'requesto-test-globals.d.ts');

interface RequestFormProps {
  onSend: (formData: RequestFormData) => void;
  onCancel: () => void;
  onChange?: (formData: RequestFormData) => void;
  onFetchGraphQLSchema?: (formData: RequestFormData) => Promise<GraphQLSchema>;
  loading: boolean;
}

interface GraphQLSchemaActionsProps {
  visible: boolean;
  schema: GraphQLSchema | null;
  error: string | null;
  schemaLoading: boolean;
  requestLoading: boolean;
  url: string;
  canFetch: boolean;
  onFetch: () => void;
  onOpen: () => void;
}

function GraphQLSchemaActions({
  visible,
  schema,
  error,
  schemaLoading,
  requestLoading,
  url,
  canFetch,
  onFetch,
  onOpen,
}: Readonly<GraphQLSchemaActionsProps>) {
  if (!visible) return null;

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Tooltip content={schema ? 'Refresh schema and IntelliSense' : 'Fetch schema for IntelliSense'}>
        <Button
          onClick={onFetch}
          variant="icon"
          size="md"
          loading={schemaLoading}
          disabled={requestLoading || !url.trim() || !canFetch}
          className="h-10 w-10 shrink-0"
          aria-label={schema ? 'Refresh GraphQL schema' : 'Fetch GraphQL schema'}
        >
          {!schemaLoading && <RefreshCw className="h-4 w-4" />}
        </Button>
      </Tooltip>
      <Tooltip content="Browse schema documentation">
        <Button
          onClick={onOpen}
          variant="icon"
          size="md"
          disabled={!schema && !error}
          className={`h-10 w-10 shrink-0 ${schema ? 'text-blue-600 dark:text-blue-400' : ''}`}
          aria-label="View GraphQL schema"
        >
          <BookOpen className="h-4 w-4" />
        </Button>
      </Tooltip>
    </div>
  );
}

export function RequestForm({ onSend, onCancel, onChange, onFetchGraphQLSchema, loading }: Readonly<RequestFormProps>) {
  const [activeTab, setActiveTab] = useState<RequestTab>('params');
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const { isDarkMode } = useThemeStore();
  const { getActiveTab, updateTabRequest } = useTabsStore();
  const { showAlert } = useAlertStore();
  const currentTab = getActiveTab();

  const { control, watch, setValue, reset, getValues } = useForm<RequestFormData>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      requestType: 'http',
      method: 'GET',
      url: '',
      headers: [{ id: '1', key: '', value: '', enabled: true }],
      params: [{ id: '1', key: '', value: '', enabled: true }],
      body: '',
      bodyType: 'json' as const,
      formDataEntries: [{ id: '1', key: '', value: '', type: 'text' as const, enabled: true }],
      auth: { type: 'none' },
      graphqlDocument: '',
      graphqlVariables: '',
      graphqlTransport: 'post',
      graphqlSchemaProfileId: '',
    },
  });

  const requestType = watch('requestType') ?? 'http';
  const urlValue = watch('url');
  const headers = watch('headers');
  const params = watch('params');
  const auth = watch('auth') as AuthConfig;
  const bodyType = watch('bodyType');
  const formDataEntries = watch('formDataEntries') as FormDataEntry[];
  const graphqlDocument = watch('graphqlDocument') ?? '';
  const graphqlSchemaProfileId = watch('graphqlSchemaProfileId') ?? '';
  const graphqlOperations = getGraphQLOperations(graphqlDocument);

  // Reset form when the active tab changes
  useEffect(() => {
    if (!currentTab) return;
    const tabReq = currentTab.request;
    const { baseUrl, params: urlParams } = extractParamsFromUrl(tabReq.url || '');

    reset({
      requestType: tabReq.requestType ?? 'http',
      method: tabReq.method || 'GET',
      url: baseUrl,
      headers:
        tabReq.headers && Object.keys(tabReq.headers).length > 0
          ? Object.entries(tabReq.headers).map(([key, value]) => ({
              id: `${key}-${Date.now()}`,
              key,
              value,
              enabled: true,
            }))
          : [{ id: Date.now().toString(), key: '', value: '', enabled: true }],
      params:
        urlParams.length > 0
          ? urlParams.map(p => ({
              id: `${p.key}-${Date.now()}`,
              key: p.key,
              value: p.value,
              enabled: true,
            }))
          : [{ id: (Date.now() + 1000).toString(), key: '', value: '', enabled: true }],
      body: tabReq.body || '',
      bodyType: tabReq.bodyType || 'json',
      formDataEntries:
        tabReq.formDataEntries && tabReq.formDataEntries.length > 0
          ? tabReq.formDataEntries
          : [{ id: Date.now().toString(), key: '', value: '', type: 'text' as const, enabled: true }],
      auth: tabReq.auth || { type: 'none' },
      preRequestScript: tabReq.preRequestScript ?? '',
      testScript: tabReq.testScript ?? '',
      graphqlDocument: tabReq.graphql?.document ?? '',
      graphqlVariables: tabReq.graphql?.variables ?? '',
      graphqlTransport: tabReq.graphql?.transport ?? 'post',
      graphqlSchemaProfileId: tabReq.graphql?.schemaProfileId ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab?.id]);

  const {
    schema: graphqlSchema,
    loading: schemaLoading,
    error: schemaError,
    profiles,
    profilesLoading,
    editingProfile,
    setEditingProfile,
    schemaDialog,
    profileDialog,
    deleteProfileDialog,
    handleFetch: handleFetchGraphQLSchema,
    handleProfileChange: handleSchemaProfileChange,
    handleSaveProfile,
    handleDeleteProfile,
  } = useGraphQLSchemaManager({
    currentTab,
    requestType,
    url: urlValue,
    profileId: graphqlSchemaProfileId,
    getValues,
    setValue,
    onFetchSchema: onFetchGraphQLSchema,
  });

  // Write back to tab store whenever the form changes
  useEffect(() => {
    if (!currentTab) return;
    const subscription = watch(data => {
      const formData = data as RequestFormData;
      updateTabRequest(currentTab.id, buildTabRequestFromFormData(formData));
      onChange?.(formData);
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab?.id, updateTabRequest]);

  const handleUrlChange = (newUrl: string) => {
    const lower = newUrl.trimStart().toLowerCase();
    const isCurl = lower.startsWith('curl ');
    const isPowerShell =
      lower.startsWith('invoke-webrequest') ||
      lower.startsWith('invoke-restmethod') ||
      lower.startsWith('iwr ') ||
      lower.startsWith('irm ') ||
      (lower.startsWith('$') && (lower.includes('invoke-webrequest') || lower.includes('invoke-restmethod')));

    if (isCurl || isPowerShell) {
      const parsed = parseCurlCommand(newUrl);
      if (!parsed) {
        showAlert('Could not parse curl command', 'error');
        return;
      }
      setValue('method', parsed.method, { shouldDirty: true });
      setValue('url', parsed.url, { shouldDirty: true });
      setValue('headers', parsed.headers, { shouldDirty: true });
      setValue('params', parsed.params, { shouldDirty: true });
      setValue('body', parsed.body, { shouldDirty: true });
      setValue('bodyType', parsed.bodyType, { shouldDirty: true });
      setValue('formDataEntries', parsed.formDataEntries, { shouldDirty: true });
      setValue('auth', parsed.auth as RequestFormData['auth'], { shouldDirty: true });
      showAlert('curl command imported', 'success');
      return;
    }

    const { baseUrl, params: extractedParams } = extractParamsFromUrl(newUrl);

    if (extractedParams.length > 0) {
      const existingParamKeys = new Set(params.map(p => p.key));
      const newParams = [...params];

      extractedParams.forEach(extracted => {
        if (!existingParamKeys.has(extracted.key)) {
          newParams.push({
            id: crypto.randomUUID(),
            key: extracted.key,
            value: extracted.value,
            enabled: true,
          });
        }
      });

      setValue('params', newParams, { shouldDirty: true });
      setValue('url', baseUrl, { shouldDirty: true });
    } else {
      setValue('url', newUrl, { shouldDirty: true });
    }
  };

  const handleHeadersChange = (newHeaders: RequestFormData['headers']) =>
    setValue('headers', newHeaders, { shouldDirty: true });
  const handleParamsChange = (newParams: RequestFormData['params']) =>
    setValue('params', newParams, { shouldDirty: true });
  const handleAuthChange = (newAuth: AuthConfig) =>
    setValue('auth', newAuth as RequestFormData['auth'], { shouldDirty: true });
  const handleBodyTypeChange = (newBodyType: RequestFormData['bodyType']) =>
    setValue('bodyType', newBodyType, { shouldDirty: true });
  const handleFormDataEntriesChange = (newEntries: FormDataEntry[]) =>
    setValue('formDataEntries', newEntries, { shouldDirty: true });
  const handleRequestTypeChange = (newRequestType: 'http' | 'graphql') => {
    setValue('requestType', newRequestType, { shouldDirty: true });
    setActiveTab(newRequestType === 'graphql' ? 'query' : 'params');
  };
  const handleRequestKindChange = (value: string) => {
    if (value.startsWith('graphql:')) {
      handleRequestTypeChange('graphql');
      setValue('graphqlTransport', value.split(':')[1] as 'post' | 'get', { shouldDirty: true });
      return;
    }
    if (requestType !== 'http') {
      handleRequestTypeChange('http');
    }
    setValue('method', value, { shouldDirty: true });
  };

  const preRequestScript = watch('preRequestScript') ?? '';
  const testScript = watch('testScript') ?? '';

  const paramsCount = params.filter(p => p.enabled && p.key.trim()).length;
  const headersCount = headers.filter(h => h.enabled && h.key.trim()).length;
  const hasPreRequestScript = preRequestScript.trim().length > 0;
  const hasTestScript = testScript.trim().length > 0;
  const requestTabs = getRequestTabs(requestType);

  useEffect(() => {
    if (!requestTabs.includes(activeTab)) {
      setActiveTab(requestType === 'graphql' ? 'query' : 'params');
    }
  }, [activeTab, requestTabs, requestType]);

  const checkScrollButtons = () => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftScroll(scrollLeft > 0);
    setShowRightScroll(scrollLeft + clientWidth < scrollWidth - 1);
  };

  useEffect(() => {
    checkScrollButtons();
    const container = tabsContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', checkScrollButtons);
    window.addEventListener('resize', checkScrollButtons);

    const resizeObserver = new ResizeObserver(checkScrollButtons);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', checkScrollButtons);
      window.removeEventListener('resize', checkScrollButtons);
      resizeObserver.disconnect();
    };
  }, []);

  const scrollTabs = (direction: 'left' | 'right') => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const scrollAmount = 100;
    const newScrollLeft =
      direction === 'left' ? container.scrollLeft - scrollAmount : container.scrollLeft + scrollAmount;

    container.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
  };

  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (container.scrollWidth > container.clientWidth) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex gap-3 items-center">
          <select
            aria-label="Request method or type"
            value={requestType === 'graphql' ? `graphql:${watch('graphqlTransport') ?? 'post'}` : watch('method')}
            onChange={event => handleRequestKindChange(event.target.value)}
            className="px-3 py-2.5 min-w-25 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 cursor-pointer"
            disabled={loading}
          >
            <optgroup label="HTTP">
              {HTTP_METHODS.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </optgroup>
            <optgroup label="GraphQL">
              <option value="graphql:post">GQL POST</option>
              <option value="graphql:get">GQL GET</option>
            </optgroup>
          </select>

          <div className="flex-1">
            <Controller
              name="url"
              control={control}
              render={({ field }) => (
                <VariableAwareInput
                  value={field.value}
                  onChange={handleUrlChange}
                  placeholder="Enter Request URL"
                  disabled={loading}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 bg-transparent text-black dark:text-gray-200"
                />
              )}
            />
          </div>

          <GraphQLSchemaActions
            visible={requestType === 'graphql'}
            schema={graphqlSchema}
            error={schemaError}
            schemaLoading={schemaLoading}
            requestLoading={loading}
            url={urlValue}
            canFetch={Boolean(onFetchGraphQLSchema)}
            onFetch={handleFetchGraphQLSchema}
            onOpen={schemaDialog.open}
          />

          <Button
            onClick={loading ? onCancel : () => onSend(getValues())}
            disabled={!loading && !urlValue.trim()}
            loading={false}
            size="md"
            variant={loading ? 'danger' : 'primary'}
          >
            {loading ? 'Cancel' : 'Send'}
          </Button>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 relative h-12">
        {showLeftScroll && (
          <Button
            onClick={() => scrollTabs('left')}
            variant="ghost"
            size="sm"
            className="absolute left-0 top-0 z-10 h-full px-3 rounded-none border-r border-gray-300 dark:border-gray-600 shadow-[4px_0_8px_rgba(0,0,0,0.1)] dark:shadow-[4px_0_8px_rgba(0,0,0,0.3)]"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </Button>
        )}

        <div
          ref={tabsContainerRef}
          className="flex px-6 h-full overflow-x-auto overflow-y-hidden scrollbar-hide"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {requestTabs.map(tab => (
            <Button
              key={tab}
              onClick={() => setActiveTab(tab)}
              variant="ghost"
              size="sm"
              className={`shrink-0 px-4 py-3 rounded-none border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {getTabLabel(tab, hasPreRequestScript, hasTestScript, paramsCount, headersCount)}
            </Button>
          ))}
        </div>

        {showRightScroll && (
          <Button
            onClick={() => scrollTabs('right')}
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 z-10 h-full px-3 rounded-none border-l border-gray-300 dark:border-gray-600 shadow-[-4px_0_8px_rgba(0,0,0,0.1)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.3)]"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-white dark:bg-gray-900">
        {activeTab === 'params' && (
          <KeyValueEditor
            items={params}
            onItemsChange={handleParamsChange}
            delimiter="="
            keyPlaceholder="Parameter"
            valuePlaceholder="Value"
            disabled={loading}
          />
        )}

        {activeTab === 'query' && (
          <div className="h-full min-h-50 flex flex-col gap-3">
            {graphqlOperations.length > 1 && (
              <div
                role="alert"
                className="flex min-w-0 items-center gap-2 text-sm text-amber-700 dark:text-amber-300"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="truncate">Multiple operations are not supported. Keep one operation in the query.</span>
              </div>
            )}
            <div className="flex-1 min-h-0 border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
              <Controller
                name="graphqlDocument"
                control={control}
                render={({ field }) => (
                  <GraphQLQueryEditor
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    schema={graphqlSchema}
                    modelId={currentTab?.id ?? 'new-request'}
                    isDarkMode={isDarkMode}
                    readOnly={loading}
                    beforeMount={defineEditorTheme}
                  />
                )}
              />
            </div>
          </div>
        )}

        {activeTab === 'variables' && (
          <div className="h-full min-h-50 border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
            <Controller
              name="graphqlVariables"
              control={control}
              render={({ field }) => (
                <Editor
                  height="100%"
                  defaultLanguage="json"
                  value={field.value ?? ''}
                  onChange={value => field.onChange(value ?? '')}
                  theme={isDarkMode ? 'custom-dark' : 'vs-light'}
                  beforeMount={defineEditorTheme}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    formatOnPaste: true,
                    formatOnType: true,
                    readOnly: loading,
                  }}
                />
              )}
            />
          </div>
        )}

        {activeTab === 'auth' && <AuthEditor auth={auth} onAuthChange={handleAuthChange} disabled={loading} />}

        {activeTab === 'headers' && (
          <KeyValueEditor
            items={headers}
            onItemsChange={handleHeadersChange}
            delimiter=":"
            keyPlaceholder="Header"
            valuePlaceholder="Value"
            disabled={loading}
          />
        )}

        {activeTab === 'body' && (
          <div className="h-full min-h-50">
            <div className="mb-3 flex items-center gap-4">
              <label
                className={`flex items-center gap-2 text-sm ${bodyType === 'json' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}
              >
                <input
                  type="radio"
                  name="bodyType"
                  value="json"
                  checked={bodyType === 'json'}
                  onChange={() => handleBodyTypeChange('json')}
                  disabled={loading}
                />
                <span>JSON</span>
              </label>
              <label
                className={`flex items-center gap-2 text-sm ${bodyType === 'form-data' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}
              >
                <input
                  type="radio"
                  name="bodyType"
                  value="form-data"
                  checked={bodyType === 'form-data'}
                  onChange={() => handleBodyTypeChange('form-data')}
                  disabled={loading}
                />
                <span>Form Data</span>
              </label>
              <label
                className={`flex items-center gap-2 text-sm ${bodyType === 'x-www-form-urlencoded' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}
              >
                <input
                  type="radio"
                  name="bodyType"
                  value="x-www-form-urlencoded"
                  checked={bodyType === 'x-www-form-urlencoded'}
                  onChange={() => handleBodyTypeChange('x-www-form-urlencoded')}
                  disabled={loading}
                />
                <span>URL Encoded</span>
              </label>
            </div>

            {bodyType === 'json' && (
              <div
                className="border border-gray-300 dark:border-gray-600 rounded overflow-hidden"
                style={{ height: 'calc(100% - 40px)' }}
              >
                <Controller
                  name="body"
                  control={control}
                  render={({ field }) => (
                    <Editor
                      height="100%"
                      defaultLanguage="json"
                      value={field.value}
                      onChange={(value: string | undefined) => field.onChange(value || '')}
                      theme={isDarkMode ? 'custom-dark' : 'vs-light'}
                      beforeMount={defineEditorTheme}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        formatOnPaste: true,
                        formatOnType: true,
                        readOnly: loading,
                      }}
                    />
                  )}
                />
              </div>
            )}

            {(bodyType === 'form-data' || bodyType === 'x-www-form-urlencoded') && (
              <KeyValueEditor
                items={formDataEntries}
                onItemsChange={items =>
                  handleFormDataEntriesChange(items.map(item => ({ ...item, type: 'text' as const })))
                }
                delimiter="="
                keyPlaceholder="Field"
                valuePlaceholder="Value"
                addLabel="+ Add Field"
                disabled={loading}
              />
            )}
          </div>
        )}

        {activeTab === 'pre-request' && (
          <div className="h-full flex flex-col gap-3 min-h-50">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Runs before the request is sent. Use{' '}
              <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">environment.set("key", "value")</code> to
              inject variables.
            </p>
            <div className="flex-1 border border-gray-300 dark:border-gray-600 rounded overflow-hidden min-h-50">
              <Controller
                name="preRequestScript"
                control={control}
                render={({ field }) => (
                  <Editor
                    height="100%"
                    defaultLanguage="javascript"
                    value={field.value ?? ''}
                    onChange={value => field.onChange(value ?? '')}
                    theme={isDarkMode ? 'custom-dark' : 'vs-light'}
                    beforeMount={beforeMountPreRequestEditor}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      readOnly: loading,
                    }}
                  />
                )}
              />
            </div>
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="h-full flex flex-col gap-3 min-h-50">
            <p className="text-xs text-gray-500 dark:text-gray-400">Runs after the response is received.</p>
            <div className="flex-1 border border-gray-300 dark:border-gray-600 rounded overflow-hidden min-h-50">
              <Controller
                name="testScript"
                control={control}
                render={({ field }) => (
                  <Editor
                    height="100%"
                    defaultLanguage="javascript"
                    value={field.value ?? ''}
                    onChange={value => field.onChange(value ?? '')}
                    theme={isDarkMode ? 'custom-dark' : 'vs-light'}
                    beforeMount={beforeMountTestEditor}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      readOnly: loading,
                    }}
                  />
                )}
              />
            </div>
          </div>
        )}
      </div>

      <Dialog
        isOpen={schemaDialog.isOpen}
        onClose={schemaDialog.close}
        title="GraphQL Schema"
        size="full"
      >
        <div className="flex h-[calc(90vh-5rem)] min-h-96 flex-col gap-4 p-6">
          <div className="flex shrink-0 items-center gap-2">
            <select
              aria-label="Schema profile"
              value={graphqlSchemaProfileId}
              onChange={event => handleSchemaProfileChange(event.target.value).catch(() => undefined)}
              disabled={profilesLoading}
              className="min-w-56 flex-1 rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:text-gray-100"
            >
              <option value="">Current request endpoint</option>
              {profiles.map(profile => (
                <option key={profile.id} value={profile.id}>{profile.name}</option>
              ))}
            </select>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditingProfile(undefined);
                profileDialog.open();
              }}
            >
              <Plus className="h-4 w-4" />
              New profile
            </Button>
            <Button
              variant="icon"
              size="md"
              aria-label="Edit schema profile"
              disabled={!graphqlSchemaProfileId}
              onClick={() => {
                setEditingProfile(profiles.find(profile => profile.id === graphqlSchemaProfileId));
                profileDialog.open();
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="icon"
              size="md"
              aria-label="Delete schema profile"
              disabled={!graphqlSchemaProfileId}
              onClick={handleDeleteProfile}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
          <div className="min-h-0 flex-1">
          <GraphQLSchemaExplorer
            schema={graphqlSchema}
            loading={schemaLoading}
            error={schemaError}
            onRefresh={handleFetchGraphQLSchema}
            disabled={loading || !urlValue.trim() || !onFetchGraphQLSchema}
          />
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={profileDialog.isOpen}
        onClose={profileDialog.close}
        title={editingProfile ? 'Edit GraphQL Schema Profile' : 'New GraphQL Schema Profile'}
        size="lg"
      >
        <div className="p-6">
          <GraphQLSchemaProfileForm
            key={editingProfile?.id ?? 'new'}
            profile={editingProfile}
            defaultUrl={urlValue}
            onSave={handleSaveProfile}
            onCancel={profileDialog.close}
          />
        </div>
      </Dialog>

      <ConfirmDialog {...deleteProfileDialog.props} />
    </div>
  );
}

function getTabLabel(
  tab: RequestTab,
  hasPreRequestScript: boolean,
  hasTestScript: boolean,
  paramsCount: number,
  headersCount: number,
): ReactNode {
  let label: ReactNode;

  switch (tab) {
    case 'pre-request':
      label = hasPreRequestScript ? (
        <>
          Pre-request <span className="text-blue-500">●</span>
        </>
      ) : (
        'Pre-request'
      );
      break;
    case 'tests':
      label = hasTestScript ? (
        <>
          Tests <span className="text-blue-500">●</span>
        </>
      ) : (
        'Tests'
      );
      break;
    default:
      label = tab.charAt(0).toUpperCase() + tab.slice(1);
  }

  if (tab === 'params' && paramsCount > 0) {
    return <>{label} ({paramsCount})</>;
  }
  if (tab === 'headers' && headersCount > 0) {
    return <>{label} ({headersCount})</>;
  }
  return label;
}