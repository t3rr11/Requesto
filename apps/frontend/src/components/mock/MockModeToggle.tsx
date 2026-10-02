import type { MockMode } from '../../store/mock/types';

const MODES: MockMode[] = ['static', 'dynamic'];

interface MockModeToggleProps {
  mode: MockMode;
  onChange: (mode: MockMode) => void;
}

export function MockModeToggle({ mode, onChange }: Readonly<MockModeToggleProps>) {
  return (
    <div className="flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden text-xs">
      {MODES.map(candidate => (
        <button
          key={candidate}
          type="button"
          onClick={() => onChange(candidate)}
          className={`px-2.5 py-1 capitalize transition-colors ${
            mode === candidate
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          {candidate}
        </button>
      ))}
    </div>
  );
}
