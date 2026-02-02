import React from 'react';
import { Button } from './Button';

interface HelpContentProps {
  onClose: () => void;
}

export const HelpContent = ({ onClose }: HelpContentProps) => {
  const shortcuts = [
    { keys: ['Ctrl', 'Enter'], description: 'Send request' },
    { keys: ['Ctrl', 'S'], description: 'Save request' },
    { keys: ['Esc'], description: 'Close modals' },
  ];

  return (
    <div className="space-y-6">
      {/* Keyboard Shortcuts Section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Keyboard Shortcuts</h3>
        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700 dark:text-gray-300">{shortcut.description}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, i) => (
                  <React.Fragment key={i}>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm">
                      {key}
                    </kbd>
                    {i < shortcut.keys.length - 1 && <span className="text-gray-400 dark:text-gray-500 mx-1">+</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t dark:border-gray-700" />

      {/* Environment Variables Section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Environment Variables</h3>
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <p>
            Use environment variables in your requests with the{' '}
            <code className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded font-mono text-xs dark:text-gray-300">
              {'{{'} variableName {'}}'}
            </code>{' '}
            syntax.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
            <p className="font-medium text-blue-900 dark:text-blue-300">Examples:</p>
            <div className="space-y-1 text-xs font-mono">
              <div className="bg-white dark:bg-gray-800 p-2 rounded">
                <span className="text-gray-500 dark:text-gray-400">URL:</span>{' '}
                <span className="text-blue-600 dark:text-blue-400">
                  {'{{'} baseUrl {'}}'}
                </span>
                /api/users
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded">
                <span className="text-gray-500 dark:text-gray-400">Header:</span> Authorization: Bearer{' '}
                <span className="text-blue-600 dark:text-blue-400">
                  {'{{'} apiToken {'}}'}
                </span>
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded">
                <span className="text-gray-500 dark:text-gray-400">Body:</span> {'{"query": "'}
                <span className="text-blue-600 dark:text-blue-400">
                  {'{{'} searchQuery {'}}'}
                </span>
                {'"'}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Variables are automatically substituted when you send a request. Type{' '}
            <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded font-mono dark:text-gray-300">{'{{'}</code> to see autocomplete suggestions.
          </p>
        </div>
      </div>

      <div className="border-t dark:border-gray-700" />

      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Use <kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">Cmd</kbd> instead of{' '}
          <kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">Ctrl</kbd> on Mac
        </p>
        <Button onClick={onClose} variant="primary" size="md">
          Got it!
        </Button>
      </div>
    </div>
  );
};
