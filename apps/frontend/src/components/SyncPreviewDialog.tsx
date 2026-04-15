import { useState, useRef } from 'react';
import { Plus, RefreshCw, Trash2, ArrowRight, Check } from 'lucide-react';
import type { SyncPreviewResult, SyncApplyBody } from '../store/collections/types';
import { Dialog } from './Dialog';
import { Button } from './Button';
import { getMethodColor } from '../helpers/collections';

interface SyncPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  preview: SyncPreviewResult | null;
  loading: boolean;
  onApply: (body: SyncApplyBody) => Promise<void>;
}

export function SyncPreviewDialog({
  isOpen,
  onClose,
  preview,
  loading,
  onApply,
}: SyncPreviewDialogProps) {
  const [selectedAdded, setSelectedAdded] = useState<Set<string>>(new Set());
  const [selectedUpdated, setSelectedUpdated] = useState<Set<string>>(new Set());
  const [selectedRemoved, setSelectedRemoved] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const initializedHashRef = useRef<string | null>(null);

  // Initialize selections when preview loads
  const initSelections = (p: SyncPreviewResult) => {
    setSelectedAdded(new Set(p.added.map(a => a.operationId)));
    setSelectedUpdated(new Set(p.updated.map(u => u.requestId)));
    setSelectedRemoved(new Set()); // Don't auto-select removals
  };

  // Reset when preview changes (only once per unique preview)
  if (preview && initializedHashRef.current !== preview.newSpecHash) {
    initializedHashRef.current = preview.newSpecHash;
    initSelections(preview);
  }

  const toggleAdded = (opId: string) => {
    setSelectedAdded(prev => {
      const next = new Set(prev);
      next.has(opId) ? next.delete(opId) : next.add(opId);
      return next;
    });
  };

  const toggleUpdated = (reqId: string) => {
    setSelectedUpdated(prev => {
      const next = new Set(prev);
      next.has(reqId) ? next.delete(reqId) : next.add(reqId);
      return next;
    });
  };

  const toggleRemoved = (reqId: string) => {
    setSelectedRemoved(prev => {
      const next = new Set(prev);
      next.has(reqId) ? next.delete(reqId) : next.add(reqId);
      return next;
    });
  };

  const buildApplyBody = (): SyncApplyBody => ({
    addedOperationIds: Array.from(selectedAdded),
    updatedRequestIds: Array.from(selectedUpdated),
    removeRequestIds: Array.from(selectedRemoved),
  });

  const handleApply = async () => {
    setApplying(true);
    try {
      await onApply(buildApplyBody());
      handleClose();
    } finally {
      setApplying(false);
    }
  };

  const handleClose = () => {
    setSelectedAdded(new Set());
    setSelectedUpdated(new Set());
    setSelectedRemoved(new Set());
    initializedHashRef.current = null;
    onClose();
  };

  const totalSelected = selectedAdded.size + selectedUpdated.size + selectedRemoved.size;

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Sync from OpenAPI Spec" size="lg" footer={
      preview && (
        <div className="flex items-center justify-between w-full">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totalSelected} change{totalSelected !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button variant="primary" onClick={handleApply} disabled={applying || totalSelected === 0}>
              {applying ? 'Applying...' : 'Apply Changes'}
            </Button>
          </div>
        </div>
      )
    }>
      {loading && (
        <div className="flex items-center justify-center py-8 gap-2 text-gray-500 dark:text-gray-400">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Checking for changes...</span>
        </div>
      )}

      {!loading && !preview && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          No preview available.
        </div>
      )}

      {!loading && preview && (
        <div className="space-y-4">
          {preview.unchangedCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 px-1">
              <Check className="w-4 h-4 text-green-500" />
              {preview.unchangedCount} request{preview.unchangedCount !== 1 ? 's' : ''} unchanged
            </div>
          )}

          {preview.added.length > 0 && (
            <Section title={`New (${preview.added.length})`} icon={<Plus className="w-4 h-4 text-green-500" />}>
              {preview.added.map(item => (
                <ToggleRow
                  key={item.operationId}
                  checked={selectedAdded.has(item.operationId)}
                  onChange={() => toggleAdded(item.operationId)}
                  method={item.request.method}
                  name={item.request.name}
                  detail={item.folderName ? `→ ${item.folderName}` : undefined}
                />
              ))}
            </Section>
          )}

          {preview.updated.length > 0 && (
            <Section title={`Updated (${preview.updated.length})`} icon={<RefreshCw className="w-4 h-4 text-blue-500" />}>
              {preview.updated.map(item => (
                <ToggleRow
                  key={item.requestId}
                  checked={selectedUpdated.has(item.requestId)}
                  onChange={() => toggleUpdated(item.requestId)}
                  method={undefined}
                  name={item.name}
                  detail={item.changes.map(c => `${c.field}: ${c.from} → ${c.to}`).join(', ')}
                />
              ))}
            </Section>
          )}

          {preview.orphaned.length > 0 && (
            <Section title={`Removed from spec (${preview.orphaned.length})`} icon={<Trash2 className="w-4 h-4 text-red-500" />}>
              <p className="text-xs text-gray-400 dark:text-gray-500 px-1 mb-1">
                Select to remove from collection. Unselected items will be kept.
              </p>
              {preview.orphaned.map(item => (
                <ToggleRow
                  key={item.requestId}
                  checked={selectedRemoved.has(item.requestId)}
                  onChange={() => toggleRemoved(item.requestId)}
                  method={undefined}
                  name={item.name}
                  detail={item.operationId}
                />
              ))}
            </Section>
          )}

          {preview.added.length === 0 && preview.updated.length === 0 && preview.orphaned.length === 0 && (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
              No changes detected.
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5 px-1">
        {icon}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span>
      </div>
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
        {children}
      </div>
    </div>
  );
}

function ToggleRow({
  checked,
  onChange,
  method,
  name,
  detail,
}: {
  checked: boolean;
  onChange: () => void;
  method?: string;
  name: string;
  detail?: string;
}) {
  return (
    <label className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} className="rounded" />
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {method && (
          <span className={`text-xs font-medium ${getMethodColor(method)} shrink-0`}>
            {method}
          </span>
        )}
        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{name}</span>
        {detail && (
          <>
            <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{detail}</span>
          </>
        )}
      </div>
    </label>
  );
}
