import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Button } from './Button';

type PageAction = {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
};

interface PageShellProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  actions?: PageAction[];
  showClose?: boolean;
  sidebar: ReactNode;
  children: ReactNode;
}

export function PageShell({ icon, title, subtitle, actions = [], showClose = true, sidebar, children }: PageShellProps) {
  const navigate = useNavigate();

  return (
    <main className="overflow-hidden relative w-full h-full">
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {icon}
                <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              {actions.map((action, i) => (
                <Button key={i} onClick={action.onClick} variant={action.variant || 'primary'} size="sm" className="flex items-center gap-2">
                  {action.icon}
                  {action.label}
                </Button>
              ))}
              {showClose && (
                <Button onClick={() => navigate('/')} variant="secondary" size="sm">
                  Close
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex min-h-0">
          {sidebar}
          <div className="flex-1 overflow-hidden flex flex-col min-w-0">{children}</div>
        </div>
      </div>
    </main>
  );
}
