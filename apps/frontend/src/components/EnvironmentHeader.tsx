import { useRef, useEffect, useState } from 'react';
import { Check, MoreVertical, Copy, Trash2, Save } from 'lucide-react';
import { Button } from './Button';

interface EnvironmentHeaderProps {
  name: string;
  isActive: boolean;
  hasUnsavedChanges: boolean;
  onNameChange: (name: string) => void;
  onSetActive: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSave: () => void;
  canDelete: boolean;
}

export const EnvironmentHeader = ({
  name,
  isActive,
  hasUnsavedChanges,
  onNameChange,
  onSetActive,
  onDuplicate,
  onDelete,
  onSave,
  canDelete,
}: EnvironmentHeaderProps) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [localName, setLocalName] = useState(name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalName(name);
  }, [name]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameBlur = () => {
    setIsEditingName(false);
    if (localName.trim() && localName !== name) {
      onNameChange(localName.trim());
    } else {
      setLocalName(name);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNameBlur();
    }
    if (e.key === 'Escape') {
      setIsEditingName(false);
      setLocalName(name);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={localName}
              onChange={e => setLocalName(e.target.value)}
              placeholder="Environment name"
              className="text-2xl font-semibold px-2 py-1 -ml-2 border-2 border-blue-500 rounded focus:outline-none w-full dark:bg-gray-800 dark:text-gray-100"
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
            />
          ) : (
            <div className="flex items-center gap-3">
              <h2
                onClick={() => setIsEditingName(true)}
                className="text-2xl font-semibold text-gray-900 dark:text-gray-100 cursor-text hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2 py-1 -ml-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                title="Click to edit"
              >
                {name || 'Untitled Environment'}
              </h2>
              {isActive && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  <Check className="w-3.5 h-3.5" />
                  Active
                </span>
              )}
              {hasUnsavedChanges && <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">● Unsaved changes</span>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            type="button"
            onClick={onSave}
            variant="primary"
            size="sm"
            className="flex items-center gap-1.5"
            disabled={!hasUnsavedChanges}
          >
            <Save className="w-4 h-4" />
            Save
          </Button>

          {!isActive && (
            <Button
              type="button"
              onClick={onSetActive}
              variant="primary"
              size="sm"
              className="bg-green-600 hover:bg-green-700 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Set Active
            </Button>
          )}

          <div className="relative">
            <Button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              variant="ghost"
              size="sm"
              className="flex items-center gap-1"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                  <button
                    type="button"
                    onClick={() => {
                      onDuplicate();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    disabled={!canDelete}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
