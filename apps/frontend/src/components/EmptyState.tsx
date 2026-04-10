import { ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
  };
  size?: 'sm' | 'lg';
}

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  size = 'lg',
}: EmptyStateProps) => {
  if (size === 'sm') {
    return (
      <div className="text-center py-12 px-4">
        <div className="flex justify-center mb-3 text-gray-300 dark:text-gray-600">{icon}</div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{description}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="flex justify-center mb-4 text-gray-300 dark:text-gray-600">{icon}</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{description}</p>
        {action && (
          <Button onClick={action.onClick} variant="primary" size="md" className="flex items-center gap-2 mx-auto">
            {action.icon}
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
};
