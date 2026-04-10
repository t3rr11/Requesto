import { useState, useEffect, useRef } from 'react';
import { Control, Controller } from 'react-hook-form';
import Editor, { Monaco } from '@monaco-editor/react';
import { Button } from '../components/Button';
import { HeadersEditor } from '../components/HeadersEditor';
import { ParamsEditor } from '../components/ParamsEditor';
import { VariableAwareInput } from '../components/VariableAwareInput';
import { AuthEditor } from '../components/AuthEditor';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AuthConfig } from '../types';
import { useThemeStore } from '../store/theme';
import { requestFormSchema, RequestFormData } from './schemas/requestFormSchema';
import { extractParamsFromUrl } from '../helpers/urlHelpers';

export { requestFormSchema, type RequestFormData };

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

type RequestTab = 'params' | 'auth' | 'headers' | 'body' | 'scripts' | 'settings';

interface RequestFormProps {
  control: Control<RequestFormData>;
  onSend: () => void;
  loading: boolean;
  urlValue: string;
  headers: RequestFormData['headers'];
  onHeadersChange: (headers: RequestFormData['headers']) => void;
  params: RequestFormData['params'];
  onParamsChange: (params: RequestFormData['params']) => void;
  onUrlChange: (url: string) => void;
  auth: AuthConfig;
  onAuthChange: (auth: AuthConfig) => void;
}

export function RequestForm({
  control,
  onSend,
  loading,
  urlValue,
  headers,
  onHeadersChange,
  params,
  onParamsChange,
  onUrlChange,
  auth,
  onAuthChange,
}: RequestFormProps) {
  const [activeTab, setActiveTab] = useState<RequestTab>('params');
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const { isDarkMode } = useThemeStore();

  // Handler for URL changes - extract query params and update params state
  const handleUrlChange = (newUrl: string) => {
    const { baseUrl, params: extractedParams } = extractParamsFromUrl(newUrl);

    if (extractedParams.length > 0) {
      // Merge extracted params with existing params
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

      onParamsChange(newParams);
      onUrlChange(baseUrl); // Update URL without query params
    } else {
      onUrlChange(newUrl);
    }
  };

  // Calculate counts for enabled params and headers
  const paramsCount = params.filter(p => p.enabled && p.key.trim()).length;
  const headersCount = headers.filter(h => h.enabled && h.key.trim()).length;

  // Check if scrolling is needed and update scroll button visibility
  const checkScrollButtons = () => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftScroll(scrollLeft > 0);
    setShowRightScroll(scrollLeft + clientWidth < scrollWidth - 1);
  };

  // Check scroll buttons on mount and when container resizes
  useEffect(() => {
    checkScrollButtons();
    const container = tabsContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', checkScrollButtons);
    window.addEventListener('resize', checkScrollButtons);

    // Use ResizeObserver to detect container size changes
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

  // Handle wheel scroll for horizontal scrolling
  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Only handle horizontal scroll if there's horizontal overflow
      if (container.scrollWidth > container.clientWidth) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex gap-3 items-center">
          <Controller
            name="method"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <select
                  {...field}
                  className="w-full px-3 py-2.5 min-w-[100px] text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 appearance-none cursor-pointer"
                  style={{
                    colorScheme: 'dark',
                  }}
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
                  placeholder="Enter request url"
                  disabled={loading}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 bg-transparent text-black dark:text-gray-200"
                />
              )}
            />
          </div>

          <Button onClick={onSend} disabled={loading || !urlValue.trim()} loading={loading} size="md">
            Send
          </Button>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 relative h-[48px]">
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
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE/Edge
          }}
        >
          {(['params', 'auth', 'headers', 'body', 'scripts', 'settings'] as RequestTab[]).map(tab => {
            let label = tab.charAt(0).toUpperCase() + tab.slice(1);
            if (tab === 'params' && paramsCount > 0) {
              label += ` (${paramsCount})`;
            } else if (tab === 'headers' && headersCount > 0) {
              label += ` (${headersCount})`;
            }

            return (
              <Button
                key={tab}
                onClick={() => setActiveTab(tab)}
                variant="ghost"
                size="sm"
                className={`flex-shrink-0 px-4 py-3 rounded-none border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {label}
              </Button>
            );
          })}
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

      <div className="flex-1 overflow-auto p-6 bg-white dark:bg-gray-900">
        {activeTab === 'params' && <ParamsEditor params={params} onParamsChange={onParamsChange} disabled={loading} />}

        {activeTab === 'auth' && <AuthEditor auth={auth} onAuthChange={onAuthChange} disabled={loading} />}

        {activeTab === 'headers' && (
          <HeadersEditor headers={headers} onHeadersChange={onHeadersChange} disabled={loading} />
        )}

        {activeTab === 'body' && (
          <div className="h-full">
            <div className="mb-3 flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100">
                <input type="radio" name="bodyType" value="json" defaultChecked />
                <span>JSON</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                <input type="radio" name="bodyType" value="xml" disabled />
                <span>XML</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                <input type="radio" name="bodyType" value="form" disabled />
                <span>Form Data</span>
              </label>
            </div>
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
                    beforeMount={(monaco: Monaco) => {
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
                    }}
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
          </div>
        )}

        {activeTab === 'scripts' && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p className="mb-4">Add pre-request and test scripts.</p>
            <div className="text-gray-400 dark:text-gray-500">Coming soon...</div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p className="mb-4">Configure request settings.</p>
            <div className="text-gray-400 dark:text-gray-500">Coming soon...</div>
          </div>
        )}
      </div>
    </div>
  );
}
