import { GitBranch, ArrowUp, ArrowDown, Circle, CloudOff } from 'lucide-react';
import { useGitStore } from '../store/git/store';

interface GitStatusBarProps {
  onOpenGitPanel: () => void;
}

export function GitStatusBar({ onOpenGitPanel }: GitStatusBarProps) {
  const { isRepo, branch, status, remotes } = useGitStore();

  if (!isRepo) return null;

  const changedCount = status?.files.length ?? 0;
  const hasRemote = remotes.length > 0;

  const branchLabel = branch ?? 'no commits yet';
  const tooltipParts: string[] = [`Branch: ${branchLabel}`];
  if (changedCount > 0) tooltipParts.push(`${changedCount} changed file${changedCount !== 1 ? 's' : ''}`);
  if (status?.ahead) tooltipParts.push(`${status.ahead} ahead`);
  if (status?.behind) tooltipParts.push(`${status.behind} behind`);
  if (!hasRemote) tooltipParts.push('No remote configured');

  return (
    <button
      onClick={onOpenGitPanel}
      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-t border-gray-200 dark:border-gray-700"
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
  );
}
