import { useState, useEffect, useRef } from 'react';
import { Control, Controller } from 'react-hook-form';
import { z } from 'zod';
import Editor from '@monaco-editor/react';
import { Button } from '../components/Button';
import { HeadersEditor } from '../components/HeadersEditor';
import { ParamsEditor } from '../components/ParamsEditor';
import { VariableAwareInput } from '../components/VariableAwareInput';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const requestFormSchema = z.object({
  method: z.string(),
  url: z.string().min(1, 'URL is required'),
  headers: z.array(
    z.object({
      id: z.string(),
      key: z.string(),
      value: z.string(),
      enabled: z.boolean(),
    })
  ),
  params: z.array(
    z.object({
      id: z.string(),
      key: z.string(),
      value: z.string(),
      enabled: z.boolean(),
    })
  ),
  body: z.string(),
  savedRequestId: z.string().optional(),
});

export type RequestFormData = z.infer<typeof requestFormSchema>;

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

type RequestTab = 'params' | 'auth' | 'headers' | 'body' | 'scripts' | 'settings';

/**
 * Extract query parameters from URL and return both the base URL and params
 */
function extractParamsFromUrl(url: string): { baseUrl: string; params: { key: string; value: string }[] } {
  try {
    // Check if URL has a protocol, if not, try to parse as a relative URL
    let urlObj: URL;
    if (url.match(/^https?:\/\//i)) {
      urlObj = new URL(url);
    } else {
      // For relative URLs or URLs without protocol, add a dummy base
      urlObj = new URL(url, 'http://dummy');
    }

    const params: { key: string; value: string }[] = [];
    urlObj.searchParams.forEach((value, key) => {
      params.push({ key, value });
    });

    // Build base URL without query params
    let baseUrl = url.split('?')[0];
    
    return { baseUrl, params };
  } catch {
    // If URL parsing fails, return as-is
    return { baseUrl: url, params: [] };
  }
}

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
}

export function RequestForm({ control, onSend, loading, urlValue, headers, onHeadersChange, params, onParamsChange, onUrlChange }: RequestFormProps) {
  const [activeTab, setActiveTab] = useState<RequestTab>('headers');
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

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
    <div className="flex-1 flex flex-col bg-white">
      {/* Request Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex gap-3 items-center">
          <Controller
            name="method"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                className="px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm min-w-[100px]"
                disabled={loading}
              >
                {HTTP_METHODS.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
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
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              )}
            />
          </div>

          <Button onClick={onSend} disabled={loading || !urlValue.trim()} loading={loading} size="md">
            Send
          </Button>
        </div>
      </div>

      {/* Request Tabs */}
      <div className="border-b border-gray-200 bg-gray-50 relative h-[48px]">
        {/* Left scroll button */}
        {showLeftScroll && (
          <button
            onClick={() => scrollTabs('left')}
            className="absolute left-0 top-0 z-10 h-full px-3 bg-gray-50 hover:bg-gray-100 transition-colors border-r border-gray-300 shadow-[4px_0_8px_rgba(0,0,0,0.1)]"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} className="text-gray-600" />
          </button>
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
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Right scroll button */}
        {showRightScroll && (
          <button
            onClick={() => scrollTabs('right')}
            className="absolute right-0 top-0 z-10 h-full px-3 bg-gray-50 hover:bg-gray-100 transition-colors border-l border-gray-300 shadow-[-4px_0_8px_rgba(0,0,0,0.1)]"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        )}
      </div>

      {/* Request Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'params' && (
          <ParamsEditor params={params} onParamsChange={onParamsChange} disabled={loading} />
        )}

        {activeTab === 'auth' && (
          <div className="text-sm text-gray-600">
            <p className="mb-4">Configure authentication for this request.</p>
            <div className="text-gray-400">Coming soon...</div>
          </div>
        )}

        {activeTab === 'headers' && (
          <HeadersEditor headers={headers} onHeadersChange={onHeadersChange} disabled={loading} />
        )}

        {activeTab === 'body' && (
          <div className="h-full">
            <div className="mb-3 flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="bodyType" value="json" defaultChecked />
                <span>JSON</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input type="radio" name="bodyType" value="xml" disabled />
                <span>XML</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input type="radio" name="bodyType" value="form" disabled />
                <span>Form Data</span>
              </label>
            </div>
            <div className="border border-gray-300 rounded overflow-hidden" style={{ height: 'calc(100% - 40px)' }}>
              <Controller
                name="body"
                control={control}
                render={({ field }) => (
                  <Editor
                    height="100%"
                    defaultLanguage="json"
                    value={field.value}
                    onChange={value => field.onChange(value || '')}
                    theme="vs-light"
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
          <div className="text-sm text-gray-600">
            <p className="mb-4">Add pre-request and test scripts.</p>
            <div className="text-gray-400">Coming soon...</div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="text-sm text-gray-600">
            <p className="mb-4">Configure request settings.</p>
            <div className="text-gray-400">Coming soon...</div>
          </div>
        )}
      </div>
    </div>
  );
}
