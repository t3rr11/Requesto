import React from 'react';
import { Button } from '../components/Button';

interface KeyboardShortcutsContentProps {
  onClose: () => void;
}

export const KeyboardShortcutsContent: React.FC<KeyboardShortcutsContentProps> = ({ onClose }) => {
  const shortcuts = [
    { keys: ['Ctrl', 'Enter'], description: 'Send request' },
    { keys: ['Ctrl', 'S'], description: 'Save request' },
    { keys: ['Esc'], description: 'Close modals' },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700">{shortcut.description}</span>
            <div className="flex gap-1">
              {shortcut.keys.map((key, i) => (
                <React.Fragment key={i}>
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded shadow-sm">
                    {key}
                  </kbd>
                  {i < shortcut.keys.length - 1 && <span className="text-gray-400 mx-1">+</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t" />

      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500 text-center">
          Use <kbd className="px-1 py-0.5 text-xs bg-gray-100 border border-gray-300 rounded">Cmd</kbd> instead of{' '}
          <kbd className="px-1 py-0.5 text-xs bg-gray-100 border border-gray-300 rounded">Ctrl</kbd> on Mac
        </p>
        <Button onClick={onClose} variant="primary" size="md">
          Got it!
        </Button>
      </div>
    </div>
  );
};
