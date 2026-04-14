import { useEffect } from 'react';
import { useGitStore } from '../store/git/store';
import { Dialog } from './Dialog';

interface DiffDialogProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
}

export function DiffDialog({ isOpen, onClose, filePath }: DiffDialogProps) {
  const { diffs, diffLoading, loadDiff } = useGitStore();

  useEffect(() => {
    if (isOpen && filePath) {
      loadDiff(filePath);
    }
  }, [isOpen, filePath, loadDiff]);

  const fileDiff = diffs.find(d => d.path === filePath) ?? diffs[0];

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={filePath} size="xl">
      <div className="max-h-[70vh] overflow-auto">
        {diffLoading ? (
          <p className="text-xs text-gray-400 py-8 text-center">Loading diff...</p>
        ) : fileDiff ? (
          <DiffContent diff={fileDiff.diff} />
        ) : (
          <p className="text-xs text-gray-400 py-8 text-center">No diff available</p>
        )}
      </div>
    </Dialog>
  );
}

function DiffContent({ diff }: { diff: string }) {
  const lines = diff.split('\n').filter(
    line =>
      !line.startsWith('diff --git') &&
      !line.startsWith('index ') &&
      !line.startsWith('--- ') &&
      !line.startsWith('+++ ') &&
      !line.startsWith('\\'),
  );

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
    <div className="text-xs font-mono leading-5">
      {blocks.map((block, bi) => {
        if (block.type === 'hunk') {
          return bi > 0 ? (
            <div key={bi} className="text-center text-gray-300 dark:text-gray-600 select-none py-0.5 border-y border-gray-100 dark:border-gray-800">
              ···
            </div>
          ) : null;
        }
        if (block.type === 'context') {
          return (
            <div key={bi}>
              {block.context.map((l, ci) => (
                <div key={ci} className="text-gray-500 dark:text-gray-400 px-4 whitespace-pre-wrap">
                  {l || '\u00A0'}
                </div>
              ))}
            </div>
          );
        }
        return (
          <div key={bi}>
            {block.removed.map((l, ri) => (
              <div key={`r${ri}`} className="text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-4 whitespace-pre-wrap">
                <span className="select-none text-red-400 dark:text-red-600 mr-2">−</span>{l}
              </div>
            ))}
            {block.added.map((l, ai) => (
              <div key={`a${ai}`} className="text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-4 whitespace-pre-wrap">
                <span className="select-none text-green-400 dark:text-green-600 mr-2">+</span>{l}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
