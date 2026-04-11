import { Keyboard, Variable } from 'lucide-react';
import { Button } from './Button';

interface HelpContentProps {
  onClose: () => void;
}

export function HelpContent({ onClose }: HelpContentProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          <Keyboard className="w-4 h-4" />
          Keyboard Shortcuts
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Save request</span>
            <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">Ctrl+S</kbd>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Close modal / dialog</span>
            <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">Esc</kbd>
          </div>
        </div>
      </div>

      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          <Variable className="w-4 h-4" />
          Environment Variables
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            Use <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">{'{{variableName}}'}</code>{' '}
            syntax in URLs, headers, and request body to reference environment variables.
          </p>
          <p>
            Variables are substituted when sending requests. Set up environments in the Environments page.
          </p>
          <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 space-y-1">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Examples:</p>
            <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{'{{baseUrl}}/api/users'}</p>
            <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{'Authorization: Bearer {{token}}'}</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Use Ctrl (or Cmd on Mac) for keyboard shortcuts.
      </p>

      <div className="flex justify-end">
        <Button onClick={onClose} variant="primary" size="sm">
          Got it!
        </Button>
      </div>
    </div>
  );
}
