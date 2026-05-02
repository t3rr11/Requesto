import { useState, useEffect, useRef, ReactNode } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Editor, { type Monaco } from '@monaco-editor/react';
import { Button } from '../components/Button';
import { KeyValueEditor } from '../components/KeyValueEditor';
import { VariableAwareInput } from '../components/VariableAwareInput';
import { AuthEditor } from '../components/AuthEditor';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AuthConfig, FormDataEntry } from '../store/request/types';
import { useThemeStore } from '../store/theme/store';
import { useTabsStore } from '../store/tabs/store';
import { extractParamsFromUrl } from '../helpers/url';
import { buildTabRequestFromFormData } from '../helpers/request';
import { parseCurlCommand } from '../helpers/curl';
import { useAlertStore } from '../store/alert/store';
import { requestFormSchema, type RequestFormData } from './schemas/requestFormSchema';
import { TEST_SCRIPT_TYPES, PRE_REQUEST_SCRIPT_TYPES } from '../helpers/scriptTypes';

export { requestFormSchema, type RequestFormData } from './schemas/requestFormSchema';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
type RequestTab = 'params' | 'auth' | 'headers' | 'body' | 'pre-request' | 'tests';

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
  loading: boolean;
}

export function RequestForm({ onSend, onCancel, onChange, loading }: RequestFormProps) {
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
      method: 'GET',
      url: '',
      headers: [{ id: '1', key: '', value: '', enabled: true }],
      params: [{ id: '1', key: '', value: '', enabled: true }],
      body: '',
      bodyType: 'json' as const,
      formDataEntries: [{ id: '1', key: '', value: '', type: 'text' as const, enabled: true }],
      auth: { type: 'none' },
    },
  });

  const urlValue = watch('url');
  const headers = watch('headers');
  const params = watch('params');
  const auth = watch('auth') as AuthConfig;
  const bodyType = watch('bodyType');
  const formDataEntries = watch('formDataEntries') as FormDataEntry[];

  // Reset form when the active tab changes
  useEffect(() => {
    if (!currentTab) return;
    const tabReq = currentTab.request;
    const { baseUrl, params: urlParams } = extractParamsFromUrl(tabReq.url || '');

    reset({
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
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab?.id]);

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
            id: Date.now().toString() + Math.random(),
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

  const preRequestScript = watch('preRequestScript') ?? '';
  const testScript = watch('testScript') ?? '';

  const paramsCount = params.filter(p => p.enabled && p.key.trim()).length;
  const headersCount = headers.filter(h => h.enabled && h.key.trim()).length;
  const hasPreRequestScript = preRequestScript.trim().length > 0;
  const hasTestScript = testScript.trim().length > 0;

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
          <Controller
            name="method"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <select
                  {...field}
                  className="w-full px-3 py-2.5 min-w-25 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 appearance-none cursor-pointer"
                  disabled={loading}
                >
                  {HTTP_METHODS.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <svg
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-500 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            )}
          />

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
          {(['params', 'auth', 'headers', 'body', 'pre-request', 'tests'] as RequestTab[]).map(tab => (
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