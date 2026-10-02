import type { MockMode } from '../../store/mock/types';

interface MockModeBadgeProps {
  mode: MockMode;
}

const MODE_CLASSES: Record<MockMode, string> = {
  static: 'bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300',
  dynamic: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
};

const MODE_LABELS: Record<MockMode, string> = {
  static: 'Static',
  dynamic: 'Dynamic',
};

export function MockModeBadge({ mode }: Readonly<MockModeBadgeProps>) {
  return (
    <span
      className={`inline-flex items-center justify-center min-w-14 text-[10px] font-semibold rounded px-1.5 py-0.5 leading-none shrink-0 ${MODE_CLASSES[mode]}`}
    >
      {MODE_LABELS[mode]}
    </span>
  );
}
