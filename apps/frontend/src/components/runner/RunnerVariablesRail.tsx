import { useMemo, useRef, useState } from 'react';
import { CaseSensitive, Eye, EyeOff, Hash, PanelRightClose, PanelRightOpen, Pencil, ToggleLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Collection } from '../../store/collections/types';
import type { Environment, EnvironmentVariableType } from '../../store/environments/types';
import { useUIStore } from '../../store/ui/store';
import { useResizablePanel } from '../../hooks/useResizablePanel';
import { runnerVariableRows, type RunnerVariableRow } from '../../helpers/runner/variables';
import { Tooltip } from '../Tooltip';
import { MASKED, VariableDiffFrom } from './helpers';
import type { RunnerVariableChange, RunnerVariablesState } from './types';

interface RunnerVariablesRailProps {
  collections: Collection[];
  environment: Environment | null;
  state: RunnerVariablesState;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onEditEnvironment: () => void;
  onEditCollection: (collectionId: string) => void;
}

const iconButton =
  'rounded-lg p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-100';

const typeIcon: Record<EnvironmentVariableType, ReactNode> = {
  string: <CaseSensitive className="w-3 h-3" />,
  number: <Hash className="w-3 h-3" />,
  boolean: <ToggleLeft className="w-3 h-3" />,
};

function RunnerVariableRowItem({
  row,
  initial,
  change,
}: {
  row: RunnerVariableRow;
  initial?: string;
  change?: RunnerVariableChange;
}) {
  const [revealed, setRevealed] = useState(false);
  const masked = row.isSecret && !revealed;
  const showDiff = change !== undefined && !masked && initial !== undefined && initial !== row.value;
  const valueText = masked ? MASKED : row.value || '(empty)';
  const valueDetail = masked ? undefined : showDiff ? `${initial} -> ${row.value}` : valueText;
  const attribution = change
    ? `set by ${change.label} (${change.phase === 'pre' ? 'pre-request' : 'test'} script)`
    : undefined;
  const tooltip = [valueDetail, attribution].filter(Boolean).join(' | ');

  return (
    <div
      className={`flex items-center gap-2 rounded px-2 py-1 ${change ? 'runner-variable-flash' : ''}`}
    >
      <Tooltip content={`type: ${row.type ?? 'string'}`}>
        <span className="text-gray-400 dark:text-gray-500 shrink-0" role="img" aria-label={`type: ${row.type ?? 'string'}`}>
          {typeIcon[row.type ?? 'string']}
        </span>
      </Tooltip>
      <span className="font-mono text-xs text-gray-700 dark:text-gray-200 truncate min-w-0">{row.key}</span>
      <Tooltip content={tooltip} className="ml-auto min-w-0">
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400 truncate min-w-0 text-right">
          {showDiff && initial !== undefined && <VariableDiffFrom from={initial} />}
          {valueText}
        </span>
      </Tooltip>
      {row.isSecret && (
        <button
          type="button"
          onClick={() => setRevealed(prev => !prev)}
          aria-label={revealed ? 'Hide value' : 'Reveal value'}
          className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 shrink-0"
        >
          {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}

function RunnerVariablesGroup({ title, onEdit, children }: Readonly<{ title: string; onEdit?: () => void; children: ReactNode }>) {
  return (
    <div>
      <div className="flex items-center gap-0.5 mb-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate min-w-0">
          {title}
        </span>
        {onEdit && (
          <button type="button" onClick={onEdit} aria-label={`Edit variables for ${title}`} className={iconButton}>
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function RunnerVariablesRail({
  collections,
  environment,
  state,
  isCollapsed,
  onToggleCollapsed,
  onEditEnvironment,
  onEditCollection,
}: Readonly<RunnerVariablesRailProps>) {
  const railRef = useRef<HTMLDivElement>(null);
  const railWidth = useUIStore(s => s.runnerVariablesWidth);
  const { handleResizeStart } = useResizablePanel({
    containerRef: railRef,
    axis: 'horizontal',
    onResize: width => useUIStore.getState().setRunnerVariablesWidth(width),
    min: 200,
    max: 520,
    origin: 'end',
  });

  // EXPLAIN: the environment is shared across the run, so it forms one group; collection groups list only their own keys.
  const { envRows, groups } = useMemo(() => {
    const envRows = runnerVariableRows(environment, null, { env: state.overrides.env });
    const envKeys = new Set(envRows.map(row => row.key));
    const groups = collections.map(collection => ({
      collection,
      rows: runnerVariableRows(environment, collection, {
        env: state.overrides.env,
        collection: state.overrides.collections[collection.id],
      }).filter(row => !envKeys.has(row.key)),
    }));
    return { envRows, groups };
  }, [collections, environment, state]);

  const changeCount = new Set([
    ...Object.keys(state.changes.env),
    ...Object.values(state.changes.collections).flatMap(changes => Object.keys(changes)),
  ]).size;
  const changeTooltip = 'Variables changed by scripts during this run';

  if (isCollapsed) {
    return (
      <div className="shrink-0 w-9 flex flex-col items-center gap-2 py-1.5 border-l border-gray-200 dark:border-gray-700">
        <button type="button" onClick={onToggleCollapsed} aria-label="Show variables panel" className={iconButton}>
          <PanelRightOpen className="w-4 h-4" />
        </button>
        {changeCount > 0 && (
          <Tooltip content={changeTooltip}>
            <span
              aria-label={`${changeCount} variables changed by scripts`}
              className="text-xs px-1.5 py-0.5 rounded font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
            >
              {changeCount}
            </span>
          </Tooltip>
        )}
      </div>
    );
  }

  return (
    <div
      ref={railRef}
      className="relative shrink-0 flex flex-col min-h-0 border-l border-gray-200 dark:border-gray-700"
      style={{ width: `${railWidth}px` }}
    >
      <button
        className="absolute left-0 top-0 h-full w-1 bg-gray-200 dark:bg-gray-700 hover:bg-orange-500 cursor-ew-resize! transition-colors"
        onMouseDown={handleResizeStart}
        title="Drag to resize"
        tabIndex={-1}
      />
      <div className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Variables
        </span>
        {changeCount > 0 && (
          <Tooltip content={changeTooltip}>
            <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
              {changeCount} changed
            </span>
          </Tooltip>
        )}
        <button type="button" onClick={onToggleCollapsed} aria-label="Hide variables panel" className={`${iconButton} ml-auto`}>
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-4">
        {envRows.length > 0 && (
          <RunnerVariablesGroup title="Environment" onEdit={onEditEnvironment}>
            {envRows.map(row => (
              <RunnerVariableRowItem
                key={state.changes.env[row.key] ? `${row.key}-${state.changes.env[row.key].seq}` : row.key}
                row={row}
                initial={state.baseline.env[row.key]}
                change={state.changes.env[row.key]}
              />
            ))}
          </RunnerVariablesGroup>
        )}
        {/* EXPLAIN: empty collections keep their group; the edit button is how variables get added. */}
        {groups.map(({ collection, rows }) => (
          <RunnerVariablesGroup
            key={collection.id}
            title={collection.name}
            onEdit={() => onEditCollection(collection.id)}
          >
            {rows.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic px-2">No variables yet</p>
            ) : (
              rows.map(row => {
                const change = state.changes.collections[collection.id]?.[row.key];
                return (
                  <RunnerVariableRowItem
                    key={change ? `${row.key}-${change.seq}` : row.key}
                    row={row}
                    initial={state.baseline.collections[collection.id]?.[row.key]}
                    change={change}
                  />
                );
              })
            )}
          </RunnerVariablesGroup>
        ))}
      </div>
    </div>
  );
}
