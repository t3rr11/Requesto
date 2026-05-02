import { CheckCircle2, XCircle } from 'lucide-react';
import type { TestResult } from '../../helpers/scriptRunner';

interface ResponseTestsProps {
  testResults?: TestResult[];
}

export function ResponseTests({ testResults }: ResponseTestsProps) {
  if (!testResults || testResults.length === 0) {
    return (
      <div className="p-6 text-sm text-gray-600 dark:text-gray-400 overflow-y-auto h-full">
        <div className="text-gray-400 dark:text-gray-500">No tests defined</div>
      </div>
    );
  }

  const passed = testResults.filter(r => r.passed).length;
  const total = testResults.length;
  const allPassed = passed === total;

  return (
    <div className="p-6 overflow-y-auto h-full flex flex-col gap-4">
      <div
        className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-md ${
          allPassed
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
        }`}
      >
        {allPassed ? (
          <CheckCircle2 className="w-4 h-4 shrink-0" />
        ) : (
          <XCircle className="w-4 h-4 shrink-0" />
        )}
        <span>
          {passed} / {total} test{total !== 1 ? 's' : ''} passed
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {testResults.map((result) => (
          <li
            key={result.name}
            className={`flex items-start gap-3 px-3 py-2.5 rounded-md border text-sm ${
              result.passed
                ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
                : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
            }`}
          >
            {result.passed ? (
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-gray-900 dark:text-gray-100">{result.name}</span>
              {result.error && (
                <span className="text-xs text-red-600 dark:text-red-400 font-mono wrap-break-word">
                  {result.error}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
