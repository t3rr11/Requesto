import { useState, useEffect } from 'react';
import {
  GitBranch,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Plus,
  FileText,
  FilePlus,
  FileX,
  AlertCircle,
  AlertTriangle,
  Clock,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useGitStore } from '../store/git/store';
import { useAlertStore } from '../store/alert/store';
import { Dialog } from './Dialog';
import { Button } from './Button';

interface GitPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  return date.toLocaleDateString();
}

type Tab = 'changes' | 'history' | 'settings';

export function GitPanel({ isOpen, onClose }: GitPanelProps) {
  const {
    isGitInstalled,
    isRepo,
    branch,
    status,
    log,
    remotes,
    statusLoading,
    operating,
    pushing,
    pulling,
    conflicts,
    diffs,
    diffLoading,
    checkGit,
    loadStatus,
    loadLog,
    loadRemotes,
    initRepo,
    commit,
    push,
    pull,
    addRemote,
    resolveConflicts,
    loadDiff,
  } = useGitStore();

  const { showAlert } = useAlertStore();
  const [activeTab, setActiveTab] = useState<Tab>('changes');
  const [commitMessage, setCommitMessage] = useState('');
  const [showAddRemote, setShowAddRemote] = useState(false);
  const [remoteName, setRemoteName] = useState('origin');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkGit().then(() => {
        if (isRepo) {
          loadStatus();
          loadLog();
          loadRemotes();
        }
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && isRepo) {
      loadStatus();
      loadLog();
      loadRemotes();
    }
  }, [isRepo]);

  const handleInit = async () => {
    try {
      await initRepo();
      showAlert('Success', 'Git repository initialized', 'success');
    } catch {
      showAlert('Error', 'Failed to initialize git repository', 'error');
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    try {
      await commit(commitMessage.trim());
      setCommitMessage('');
      showAlert('Success', 'Changes committed', 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Commit failed';
      showAlert('Error', msg, 'error');
    }
  };

  const handlePush = async () => {
    try {
      await push();
      showAlert('Success', 'Pushed to remote', 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Push failed';
      showAlert('Error', msg, 'error');
    }
  };

  const handlePull = async () => {
    try {
      const result = await pull();
      if (result.conflicts.length > 0) {
        showAlert('Conflicts Detected', result.message, 'warning');
      } else {
        showAlert('Success', result.message, 'success');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Pull failed';
      showAlert('Error', msg, 'error');
    }
  };

  const handleResolveAll = async (strategy: 'ours' | 'theirs') => {
    try {
      await resolveConflicts(strategy);
      showAlert('Success', `Conflicts resolved (accepted ${strategy === 'theirs' ? 'incoming' : 'local'} changes). You can now commit.`, 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to resolve conflicts';
      showAlert('Error', msg, 'error');
    }
  };

  const handleAddRemote = async () => {
    if (!remoteName.trim() || !remoteUrl.trim()) return;
    try {
      await addRemote(remoteName.trim(), remoteUrl.trim());
      setShowAddRemote(false);
      setRemoteName('origin');
      setRemoteUrl('');
      showAlert('Success', 'Remote added', 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to add remote';
      showAlert('Error', msg, 'error');
    }
  };

  const handleRefresh = async () => {
    await loadStatus();
    await loadLog();
    await loadRemotes();
    setExpandedFile(null);
  };

  const handleToggleDiff = async (filePath: string) => {
    if (expandedFile === filePath) {
      setExpandedFile(null);
      return;
    }
    setExpandedFile(filePath);
    await loadDiff(filePath);
  };

  const getFileIcon = (index: string, workingDir: string) => {
    if (index === '?' || workingDir === '?') return <FilePlus className="w-3.5 h-3.5 text-green-500" />;
    if (index === 'D' || workingDir === 'D') return <FileX className="w-3.5 h-3.5 text-red-500" />;
    if (index === 'A') return <FilePlus className="w-3.5 h-3.5 text-green-500" />;
    return <FileText className="w-3.5 h-3.5 text-amber-500" />;
  };

  const getFileStatus = (index: string, workingDir: string) => {
    if (index === '?' || workingDir === '?') return 'untracked';
    if (index === 'D' || workingDir === 'D') return 'deleted';
    if (index === 'A') return 'added';
    if (index === 'M' || workingDir === 'M') return 'modified';
    if (index === 'R') return 'renamed';
    return 'changed';
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'changes', label: 'Changes', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'history', label: 'History', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-3.5 h-3.5" /> },
  ];

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Git" size="lg">
      {!isGitInstalled ? (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Git is not installed or not found in PATH.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Install Git to enable version control features.
          </p>
        </div>
      ) : !isRepo ? (
        <div className="text-center py-8">
          <GitBranch className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            This workspace is not a git repository.
          </p>
          <Button onClick={handleInit} variant="primary" size="md" loading={operating}>
            Initialize Repository
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Branch & Sync Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {branch ?? 'no commits yet'}
              </span>
              {status && status.ahead > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-green-600 dark:text-green-400" title={`${status.ahead} commit(s) ahead`}>
                  <ArrowUp className="w-3 h-3" /> {status.ahead}
                </span>
              )}
              {status && status.behind > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-blue-600 dark:text-blue-400" title={`${status.behind} commit(s) behind`}>
                  <ArrowDown className="w-3 h-3" /> {status.behind}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleRefresh}
                variant="icon"
                size="sm"
                title="Refresh"
                disabled={statusLoading}
              >
                <RefreshCw className={`w-4 h-4 ${statusLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                onClick={handlePull}
                variant="secondary"
                size="sm"
                loading={pulling}
                disabled={pulling || pushing}
              >
                <ArrowDown className="w-3.5 h-3.5" /> Pull
              </Button>
              <Button
                onClick={handlePush}
                variant="secondary"
                size="sm"
                loading={pushing}
                disabled={pushing || pulling}
              >
                <ArrowUp className="w-3.5 h-3.5" /> Push
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'changes' && status && !status.isClean && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full">
                    {status.files.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'changes' && (
            <div className="space-y-4">
              {/* Conflict Resolution Banner */}
              {conflicts.length > 0 && (
                <div className="border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Merge Conflicts
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                        {conflicts.length} file{conflicts.length !== 1 ? 's have' : ' has'} conflicts that need to be resolved:
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {conflicts.map(file => (
                          <li key={file} className="text-xs font-mono text-amber-700 dark:text-amber-300">
                            • {file}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-6">
                    <Button
                      onClick={() => handleResolveAll('theirs')}
                      variant="secondary"
                      size="sm"
                      loading={operating}
                    >
                      Accept Incoming
                    </Button>
                    <Button
                      onClick={() => handleResolveAll('ours')}
                      variant="secondary"
                      size="sm"
                      loading={operating}
                    >
                      Keep Local
                    </Button>
                  </div>
                </div>
              )}

              {/* Changed Files */}
              {status?.isClean ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 py-4 text-center">
                  Working directory clean
                </p>
              ) : (
                <div className="max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                  {status?.files.map((file, i) => (
                    <div key={i} className="border-b last:border-b-0 border-gray-100 dark:border-gray-700">
                      <button
                        onClick={() => handleToggleDiff(file.path)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        {expandedFile === file.path ? (
                          <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
                        )}
                        {getFileIcon(file.index, file.workingDir)}
                        <span className="flex-1 truncate text-gray-700 dark:text-gray-300 font-mono">
                          {file.path}
                        </span>
                        <span className="text-gray-400 dark:text-gray-500 capitalize">
                          {getFileStatus(file.index, file.workingDir)}
                        </span>
                      </button>
                      {expandedFile === file.path && (
                        <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-2 overflow-x-auto">
                          {diffLoading ? (
                            <p className="text-xs text-gray-400 py-2 text-center">Loading diff...</p>
                          ) : diffs.length > 0 ? (
                            <div className="text-[11px] font-mono leading-5 space-y-1">
                              {diffs.map((d, di) => {
                                // Parse diff into hunks of changes
                                const lines = d.diff.split('\n').filter(line =>
                                  !line.startsWith('diff --git') &&
                                  !line.startsWith('index ') &&
                                  !line.startsWith('--- ') &&
                                  !line.startsWith('+++ ') &&
                                  !line.startsWith('\\')
                                );

                                // Group consecutive -/+ lines into change blocks
                                const blocks: { type: 'context' | 'hunk' | 'change'; removed: string[]; added: string[]; context: string[] }[] = [];
                                let currentRemoved: string[] = [];
                                let currentAdded: string[] = [];

                                const flushChange = () => {
                                  if (currentRemoved.length > 0 || currentAdded.length > 0) {
                                    blocks.push({ type: 'change', removed: [...currentRemoved], added: [...currentAdded], context: [] });
                                    currentRemoved = [];
                                    currentAdded = [];
                                  }
                                };

                                for (const line of lines) {
                                  if (line.startsWith('@@')) {
                                    flushChange();
                                    blocks.push({ type: 'hunk', removed: [], added: [], context: [] });
                                  } else if (line.startsWith('-')) {
                                    currentRemoved.push(line.slice(1));
                                  } else if (line.startsWith('+')) {
                                    currentAdded.push(line.slice(1));
                                  } else {
                                    flushChange();
                                    blocks.push({ type: 'context', removed: [], added: [], context: [line.startsWith(' ') ? line.slice(1) : line] });
                                  }
                                }
                                flushChange();

                                return (
                                  <div key={di}>
                                    {blocks.map((block, bi) => {
                                      if (block.type === 'hunk') {
                                        return bi > 0 ? (
                                          <div key={bi} className="text-center text-gray-300 dark:text-gray-600 select-none py-0.5">
                                            ···
                                          </div>
                                        ) : null;
                                      }
                                      if (block.type === 'context') {
                                        return (
                                          <div key={bi}>
                                            {block.context.map((l, ci) => (
                                              <div key={ci} className="text-gray-400 dark:text-gray-500 px-2 whitespace-pre-wrap">
                                                {l || '\u00A0'}
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      }
                                      // Change block — show removed then added
                                      return (
                                        <div key={bi}>
                                          {block.removed.map((l, ri) => (
                                            <div key={`r${ri}`} className="text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 whitespace-pre-wrap rounded-sm">
                                              <span className="select-none text-red-400 dark:text-red-600 mr-1">−</span>{l}
                                            </div>
                                          ))}
                                          {block.added.map((l, ai) => (
                                            <div key={`a${ai}`} className="text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 whitespace-pre-wrap rounded-sm">
                                              <span className="select-none text-green-400 dark:text-green-600 mr-1">+</span>{l}
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 py-2 text-center">No diff available</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Commit */}
              <div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commitMessage}
                    onChange={e => setCommitMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleCommit();
                      }
                    }}
                    placeholder="Commit message..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Button
                    onClick={handleCommit}
                    variant="primary"
                    size="md"
                    loading={operating}
                    disabled={!commitMessage.trim() || operating || (status?.isClean ?? false)}
                  >
                    Commit
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              {log.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 py-4 text-center">
                  No commits yet
                </p>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-0.5">
                  {log.map(entry => (
                    <div
                      key={entry.hash}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <span className="text-xs font-mono text-gray-400 dark:text-gray-500 pt-0.5 shrink-0">
                        {entry.hash.slice(0, 7)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                          {entry.message}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {entry.author} &middot; {formatRelativeDate(entry.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              {/* Remotes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Remotes
                  </h3>
                  <Button
                    onClick={() => setShowAddRemote(!showAddRemote)}
                    variant="icon"
                    size="sm"
                    title="Add remote"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {remotes.length === 0 && !showAddRemote ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 py-2 text-center">
                    No remotes configured.{' '}
                    <button
                      onClick={() => setShowAddRemote(true)}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Add one
                    </button>
                  </p>
                ) : (
                  <div className="space-y-1">
                    {remotes.map(remote => (
                      <div
                        key={remote.name}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 rounded"
                      >
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {remote.name}
                        </span>
                        <span className="truncate text-gray-500 dark:text-gray-400 font-mono">
                          {remote.fetchUrl}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {showAddRemote && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={remoteName}
                      onChange={e => setRemoteName(e.target.value)}
                      placeholder="Name"
                      className="w-24 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <input
                      type="text"
                      value={remoteUrl}
                      onChange={e => setRemoteUrl(e.target.value)}
                      placeholder="https://github.com/user/repo.git"
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <Button onClick={handleAddRemote} variant="primary" size="sm" loading={operating}>
                      Add
                    </Button>
                    <Button onClick={() => setShowAddRemote(false)} variant="ghost" size="sm">
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
