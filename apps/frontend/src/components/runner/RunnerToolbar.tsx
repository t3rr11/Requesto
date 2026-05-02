import { Play, Square } from 'lucide-react';
import { Button } from '../Button';

interface RunnerToolbarProps {
  running: boolean;
  requestCount: number;
  finishedCount: number;
  passedCount: number;
  failedCount: number;
  errorCount: number;
  totalTests: number;
  passedTests: number;
  onRun: () => void;
  onStop: () => void;
  onReset: () => void;
}

export function RunnerToolbar({
  running,
  requestCount,
  finishedCount,
  passedCount,
  failedCount,
  errorCount,
  totalTests,
  passedTests,
  onRun,
  onStop,
  onReset,
}: RunnerToolbarProps) {
  return (
    <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
      {!running ? (
        <Button
          variant="primary"
          size="sm"
          onClick={onRun}
          disabled={requestCount === 0}
          className="flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          Run Collection
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          onClick={onStop}
          className="flex items-center gap-2"
        >
          <Square className="w-4 h-4" />
          Stop
        </Button>
      )}
      {!running && finishedCount > 0 && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset
        </Button>
      )}
      <div className="ml-auto flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
        {finishedCount > 0 && (
          <>
            <span className="text-green-600 dark:text-green-400 font-medium">{passedCount} passed</span>
            {failedCount > 0 && <span className="text-red-600 dark:text-red-400 font-medium">{failedCount} failed</span>}
            {errorCount > 0 && <span className="text-orange-500 dark:text-orange-400 font-medium">{errorCount} errors</span>}
            {totalTests > 0 && (
              <span>
                Tests: <span className="font-medium text-gray-700 dark:text-gray-300">{passedTests}/{totalTests}</span>
              </span>
            )}
          </>
        )}
        <span className="text-gray-400 dark:text-gray-500">{requestCount} requests</span>
      </div>
    </div>
  );
}
