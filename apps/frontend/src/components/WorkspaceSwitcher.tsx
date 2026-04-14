import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Settings, Check, Search, GitBranch, Pencil, X } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspace/store';
import { useAlertStore } from '../store/alert/store';

interface WorkspaceSwitcherProps {
  onManageWorkspaces: () => void;
  variant?: 'sidebar' | 'header';
}

export function WorkspaceSwitcher({ onManageWorkspaces, variant = 'sidebar' }: WorkspaceSwitcherProps) {
  const { registry, switchWorkspace, updateWorkspace } = useWorkspaceStore();
  const { showAlert } = useAlertStore();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const activeWorkspace = registry.workspaces.find(w => w.id === registry.activeWorkspaceId);

  const filtered = registry.workspaces.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
        setEditingId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) searchRef.current?.focus();
  }, [isOpen]);

  const handleSwitch = async (id: string) => {
    if (id === registry.activeWorkspaceId) {
      setIsOpen(false);
      setSearch('');
      return;
    }
    try {
      await switchWorkspace(id);
      setIsOpen(false);
      setSearch('');
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch workspace:', error);
    }
  };

  const handleStartRename = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditName(name);
  };

  const handleSaveRename = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingId || !editName.trim()) return;
    try {
      await updateWorkspace(editingId, { name: editName.trim() });
      setEditingId(null);
    } catch {
      showAlert('Error', 'Failed to rename workspace', 'error');
    }
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditName('');
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium transition-colors max-w-45 ${
          variant === 'header'
            ? 'text-white/90 dark:text-gray-300 hover:bg-white/15 dark:hover:bg-gray-700'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        title={activeWorkspace?.name || 'Select workspace'}
      >
        <span className="truncate">{activeWorkspace?.name || 'No workspace'}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1">
          {/* Search */}
          <div className="px-2 pb-1">
            <div className="flex items-center gap-1 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-sm bg-gray-50 dark:bg-gray-700">
              <Search className="w-3 h-3 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search workspaces..."
                className="flex-1 bg-transparent outline-none text-xs text-gray-700 dark:text-gray-300"
              />
              {search && (
                <button onClick={() => setSearch('')} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Workspaces
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 text-center">No matching workspaces</p>
            ) : (
              filtered.map(workspace => (
                <div
                  key={workspace.id}
                  className={`group flex items-center gap-1 ${editingId === workspace.id ? 'px-3 py-2' : ''} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                >
                  {editingId === workspace.id ? (
                    <form onSubmit={handleSaveRename} className="flex-1 flex items-center gap-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Escape') handleCancelRename(); }}
                        className="flex-1 px-1.5 py-0.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        autoFocus
                        onClick={e => e.stopPropagation()}
                      />
                      <button type="submit" className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-1">Save</button>
                      <button type="button" onClick={handleCancelRename} className="text-xs text-gray-400 hover:underline px-1">Cancel</button>
                    </form>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSwitch(workspace.id)}
                        className="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 text-left min-w-0"
                      >
                        {workspace.id === registry.activeWorkspaceId ? (
                          <Check className="w-4 h-4 text-blue-500 shrink-0" />
                        ) : (
                          <span className="w-4 h-4 shrink-0" />
                        )}
                        <span className="truncate">{workspace.name}</span>
                        {workspace.isGitRepo && (
                          <span title="Git repository">
                            <GitBranch className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0" />
                          </span>
                        )}
                      </button>
                      <button
                        onClick={e => handleStartRename(e, workspace.id, workspace.name)}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                        title="Rename"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 mt-1 pt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                setSearch('');
                onManageWorkspaces();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <Settings className="w-4 h-4 shrink-0" />
              Manage Workspaces...
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
