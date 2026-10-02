import { AlertTriangle } from 'lucide-react';
import { MethodBadge } from '../sidebar/MethodBadge';

interface RouteDefinition {
  method: string;
  byId: boolean;
  description: string;
}

const ROUTES: RouteDefinition[] = [
  { method: 'GET', byId: false, description: 'List records' },
  { method: 'POST', byId: false, description: 'Create a record' },
  { method: 'GET', byId: true, description: 'Read one record' },
  { method: 'PUT', byId: true, description: 'Replace a record' },
  { method: 'PATCH', byId: true, description: 'Merge into a record' },
  { method: 'DELETE', byId: true, description: 'Remove a record' },
];

const CODE_CHIP_CLASSES =
  'font-mono text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200';

function RouteRow({ method, byId, description, base }: Readonly<RouteDefinition & { base: string }>) {
  return (
    <li className="flex items-center gap-3 px-3 py-2 min-w-0">
      <span className="w-14 shrink-0 flex">
        <MethodBadge method={method} />
      </span>
      <code
        className="font-mono text-xs text-gray-700 dark:text-gray-200 truncate min-w-0"
        title={byId ? `${base}/{id}` : base}
      >
        {base}
        {byId && <span className="text-orange-600 dark:text-orange-400">/{'{id}'}</span>}
      </code>
      <span className="ml-auto pl-2 text-xs text-gray-500 dark:text-gray-400 shrink-0">{description}</span>
    </li>
  );
}

interface DynamicRoutesInfoProps {
  path: string;
  recordsMissingId: number;
}

function MissingIdWarning({ count }: Readonly<{ count: number }>) {
  const noun = count === 1 ? 'record is' : 'records are';
  return (
    <div
      role="alert"
      className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-300"
    >
      <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
      <p>
        {count} {noun} missing an <code className="font-mono">id</code>. Records without one can't be read, replaced,
        merged or removed by id.
      </p>
    </div>
  );
}

export function DynamicRoutesInfo({ path, recordsMissingId }: Readonly<DynamicRoutesInfoProps>) {
  const base = path.trim() === '' ? '{path}' : path;
  return (
    <div>
      {recordsMissingId > 0 && <MissingIdWarning count={recordsMissingId} />}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-200">Routes are handled automatically</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Each route reads and writes the live dataset. Edit and save records in the data pane and they are served
            immediately.
          </p>
        </div>

        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {ROUTES.map(route => (
            <RouteRow key={`${route.method}-${route.byId}`} {...route} base={base} />
          ))}
        </ul>

        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span>Filter the list with query params:</span>
          <code className={CODE_CHIP_CLASSES}>{`${base}?id=1`}</code>
          <code className={CODE_CHIP_CLASSES}>{`${base}?name=bob`}</code>
        </div>
      </div>
    </div>
  );
}
