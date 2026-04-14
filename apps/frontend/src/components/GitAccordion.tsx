import { useState, useEffect } from 'react';
import {
  GitBranch,
  ChevronDown,
  ChevronRight,
  FileText,
  FilePlus,
  FileX,
  AlertCircle,
  AlertTriangle,
  Clock,
  Settings,
  Plus,
} from 'lucide-react';
import { useGitStore } from '../store/git/store';
import { useAlertStore } from '../store/alert/store';
import { Button } from './Button';
import { DiffDialog } from './DiffDialog';

interface GitAccordionProps {
  isOpen: boolean;
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

type Section = 'changes' | 'history' | 'settings';

export function GitAccordion({ isOpen }: GitAccordionProps) {
  const {
    isGitInstalled,
    isRepo,
    status,
    log,
    remotes,
    operating,
    conflicts,
    checkGit,
    loadStatus,
    loadLog,
    loadRemotes,
    initRepo,
    commit,
    resolveConflicts,
    addRemote,
  } = useGitStore();

  const { showAlert } = useAlertStore();
  const [expandedSections, setExpandedSections] = useState<Set<Section>>(new Set(['changes']));
  const [commitMessage, setCommitMessage] = useState('');
  const [diffFile, setDiffFile] = useState<string | null>(null);
  const [showAddRemote, setShowAddRemote] = useState(false);
  const [remoteName, setRemoteName] = useState('origin');
  const [remoteUrl, setRemoteUrl] = useState('');

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

  if (!isOpen) return null;

  const toggleSection = (section: Section) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

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

  const getFileIcon = (index: string, workingDir: string) => {
    if (index === '?' || workingDir === '?') return <FilePlus className="w-3 h-3 text-green-500" />;
    if (index === 'D' || workingDir === 'D') return <FileX className="w-3 h-3 text-red-500" />;
    if (index === 'A') return <FilePlus className="w-3 h-3 text-green-500" />;
    return <FileText className="w-3 h-3 text-amber-500" />;
  };

  const getFileStatus = (index: string, workingDir: string) => {
    if (index === '?' || workingDir === '?') return 'U';
    if (index === 'D' || workingDir === 'D') return 'D';
    if (index === 'A') return 'A';
    if (index === 'M' || workingDir === 'M') return 'M';
    if (index === 'R') return 'R';
    return 'C';
  };

  const getStatusBg = (index: string, workingDir: string) => {
    if (index === '?' || workingDir === '?') return 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40';
    if (index === 'D' || workingDir === 'D') return 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40';
    if (index === 'A') return 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40';
    return 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40';
  };

  // Not installed or not a repo
  if (!isGitInstalled) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-8 h-8 mb-2 text-gray-400" />
        <p className="text-xs text-gray-500 dark:text-gray-400">Git is not installed</p>
      </div>
    );
  }

  if (!isRepo) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <GitBranch className="w-8 h-8 mb-2 text-gray-400" />
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Not a git repository</p>
        <Button onClick={handleInit} variant="primary" size="sm" loading={operating}>
          Initialize Repository
        </Button>
      </div>
    );
  }

  const sectionHeader = (section: Section, label: string, icon: React.ReactNode, badge?: React.ReactNode) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider bg-gray-100 dark:bg-gray-800/80 hover:bg-gray-200/70 dark:hover:bg-gray-700/60 border-y border-gray-200 dark:border-gray-700 transition-colors"
    >
      {expandedSections.has(section) ? (
        <ChevronDown className="w-3 h-3 shrink-0" />
      ) : (
        <ChevronRight className="w-3 h-3 shrink-0" />
      )}
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge}
    </button>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* CHANGES Section */}
      {sectionHeader(
        'changes',
        'Changes',
        <FileText className="w-3 h-3" />,
        status && !status.isClean ? (
          <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full">
            {status.files.length}
          </span>
        ) : undefined,
      )}
      {expandedSections.has('changes') && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Commit Input */}
          <div className="px-2 py-3 space-y-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
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
              className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            />
            <Button
              onClick={handleCommit}
              variant="primary"
              size="sm"
              loading={operating}
              disabled={!commitMessage.trim() || operating || (status?.isClean ?? false)}
              className="w-full"
            >
              Commit
            </Button>
          </div>

          <div className="overflow-y-auto flex-1 min-h-0">
          {/* Conflict Banner */}
          {conflicts.length > 0 && (
            <div className="mx-2 mb-1 border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded p-2 space-y-2">
              <div className="flex items-start gap-1.5">
                <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-medium text-amber-800 dark:text-amber-200">
                    {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
                  </p>
                  <ul className="mt-0.5 space-y-0.5">
                    {conflicts.map(file => (
                      <li key={file} className="text-[10px] font-mono text-amber-700 dark:text-amber-300 truncate">
                        {file}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex gap-1 ml-4">
                <Button onClick={() => handleResolveAll('theirs')} variant="secondary" size="sm" loading={operating}>
                  Accept Incoming
                </Button>
                <Button onClick={() => handleResolveAll('ours')} variant="secondary" size="sm" loading={operating}>
                  Keep Local
                </Button>
              </div>
            </div>
          )}

          {/* Changed Files */}
          {status?.isClean ? (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 py-3 text-center">
              Working directory clean
            </p>
          ) : (
            <div>
              {status?.files.map((file, i) => (
                <button
                  key={i}
                  onClick={() => setDiffFile(file.path)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] w-full text-left hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group border-l-2 border-transparent hover:border-blue-400 dark:hover:border-blue-500"
                >
                  {getFileIcon(file.index, file.workingDir)}
                  <span className="flex-1 truncate text-gray-700 dark:text-gray-200 font-mono">
                    {file.path}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getStatusBg(file.index, file.workingDir)} shrink-0`}>
                    {getFileStatus(file.index, file.workingDir)}
                  </span>
                </button>
              ))}
            </div>
          )}
          </div>
        </div>
      )}

      {/* HISTORY Section */}
      {sectionHeader('history', 'History', <Clock className="w-3 h-3" />)}
      {expandedSections.has('history') && (
        <div className="overflow-y-auto flex-1 min-h-0">
          {log.length === 0 ? (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 py-3 text-center">No commits yet</p>
          ) : (
            <div>
              {log.map(entry => (
                <div
                  key={entry.hash}
                  className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 pt-0.5 shrink-0">
                    {entry.hash.slice(0, 7)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-800 dark:text-gray-200 truncate">{entry.message}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                      {entry.author} &middot; {formatRelativeDate(entry.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SETTINGS Section */}
      {sectionHeader('settings', 'Settings', <Settings className="w-3 h-3" />)}
      {expandedSections.has('settings') && (
        <div className="overflow-y-auto flex-1 min-h-0 px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Remotes</span>
            <button
              onClick={() => setShowAddRemote(!showAddRemote)}
              className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Add remote"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          {remotes.length === 0 && !showAddRemote ? (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 py-1 text-center">
              No remotes.{' '}
              <button onClick={() => setShowAddRemote(true)} className="text-blue-600 dark:text-blue-400 hover:underline">
                Add one
              </button>
            </p>
          ) : (
            <div className="space-y-0.5">
              {remotes.map(remote => (
                <div key={remote.name} className="flex items-center gap-1.5 py-0.5 text-[10px]">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{remote.name}</span>
                  <span className="truncate text-gray-400 dark:text-gray-500 font-mono">{remote.fetchUrl}</span>
                </div>
              ))}
            </div>
          )}
          {showAddRemote && (
            <div className="mt-1.5 space-y-1">
              <input
                type="text"
                value={remoteName}
                onChange={e => setRemoteName(e.target.value)}
                placeholder="Name"
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <input
                type="text"
                value={remoteUrl}
                onChange={e => setRemoteUrl(e.target.value)}
                placeholder="https://github.com/user/repo.git"
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <div className="flex gap-1">
                <Button onClick={handleAddRemote} variant="primary" size="sm" loading={operating}>
                  Add
                </Button>
                <Button onClick={() => setShowAddRemote(false)} variant="ghost" size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Diff Dialog */}
      <DiffDialog
        isOpen={diffFile !== null}
        onClose={() => setDiffFile(null)}
        filePath={diffFile ?? ''}
      />
    </div>
  );
}
