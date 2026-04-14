import { useState } from 'react';
import { GitBranch, ArrowUp, ArrowDown, Circle, CloudOff, RefreshCw, Loader2 } from 'lucide-react';
import { useGitStore } from '../store/git/store';
import { useAlertStore } from '../store/alert/store';
import { CommitAndPushForm } from '../forms/CommitAndPushForm';

interface GitStatusBarProps {
  onTogglePanel: () => void;
}

export function GitStatusBar({ onTogglePanel }: GitStatusBarProps) {
  const { isRepo, branch, status, remotes, pushing, pulling, statusLoading, push, pull, commit, loadStatus } = useGitStore();
  const { showAlert } = useAlertStore();
  const [commitPushOpen, setCommitPushOpen] = useState(false);

  if (!isRepo) return null;

  const changedCount = status?.files.length ?? 0;
  const hasRemote = remotes.length > 0;

  const branchLabel = branch ?? 'no commits yet';
  const tooltipParts: string[] = [`Branch: ${branchLabel}`];
  if (changedCount > 0) tooltipParts.push(`${changedCount} changed file${changedCount !== 1 ? 's' : ''}`);
  if (status?.ahead) tooltipParts.push(`${status.ahead} ahead`);
  if (status?.behind) tooltipParts.push(`${status.behind} behind`);
  if (!hasRemote) tooltipParts.push('No remote configured');

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await loadStatus();
  };

  const handlePull = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handlePush = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status && !status.isClean && (status.ahead ?? 0) === 0) {
      setCommitPushOpen(true);
      return;
    }
    try {
      await push();
      showAlert('Success', 'Pushed to remote', 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Push failed';
      showAlert('Error', msg, 'error');
    }
  };

  const handleCommitAndPush = async (message: string) => {
    await commit(message);
    await push();
    showAlert('Success', 'Committed and pushed to remote', 'success');
  };

  return (
    <div className="flex items-center border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={onTogglePanel}
        className="flex-1 flex items-center gap-2 px-4 py-2 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-w-0"
        title={tooltipParts.join(' · ')}
      >
        <GitBranch className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate font-medium">{branchLabel}</span>

        {status && !status.isClean && (
          <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
            <Circle className="w-2 h-2 fill-current" />
            <span>{changedCount}</span>
          </span>
        )}

        {status && status.ahead > 0 && (
          <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400">
            <ArrowUp className="w-3 h-3" />
            <span>{status.ahead}</span>
          </span>
        )}

        {status && status.behind > 0 && (
          <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400">
            <ArrowDown className="w-3 h-3" />
            <span>{status.behind}</span>
          </span>
        )}

        {!hasRemote && (
          <CloudOff className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0" />
        )}
      </button>

      {/* Quick action buttons */}
      <div className="flex items-center gap-0.5 px-2 shrink-0">
        <button
          onClick={handleRefresh}
          disabled={statusLoading}
          className="p-1 rounded text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          title="Refresh status"
        >
          <RefreshCw className={`w-3 h-3 ${statusLoading ? 'animate-spin' : ''}`} />
        </button>
        {hasRemote && (
          <>
            <button
              onClick={handlePull}
              disabled={pulling || pushing}
              className="p-1 rounded text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              title="Pull"
            >
              {pulling ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowDown className="w-3 h-3" />}
            </button>
            <button
              onClick={handlePush}
              disabled={pushing || pulling}
              className="p-1 rounded text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              title="Push"
            >
              {pushing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUp className="w-3 h-3" />}
            </button>
          </>
        )}
      </div>

      <CommitAndPushForm
        isOpen={commitPushOpen}
        onClose={() => setCommitPushOpen(false)}
        onConfirm={handleCommitAndPush}
        changedCount={changedCount}
      />
    </div>
  );
}
