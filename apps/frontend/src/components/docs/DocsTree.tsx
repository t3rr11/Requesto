import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Folder, Package } from 'lucide-react';
import type { DocsTreeNode } from './DocsTreeHelpers';

interface DocsTreeProps {
  nodes: DocsTreeNode[];
  activeId?: string;
  onNavigate: (node: DocsTreeNode) => void;
}

interface DocsTreeItemProps {
  node: DocsTreeNode;
  expandedIds: Set<string>;
  activeId?: string;
  onToggle: (nodeId: string) => void;
  onNavigate: (node: DocsTreeNode) => void;
}

function DocsTreeItem({ node, expandedIds, activeId, onToggle, onNavigate }: DocsTreeItemProps) {
  const isBranch = node.kind !== 'request';
  const expanded = expandedIds.has(node.id);

  const icon =
    node.kind === 'collection' ? (
      <Package className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 shrink-0" />
    ) : node.kind === 'folder' ? (
      <Folder className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
    ) : (
      <FileText className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
    );

  return (
    <div>
      <div className="flex items-center">
        {isBranch ? (
          <button
            type="button"
            aria-label={`Toggle ${node.name}`}
            onClick={() => onToggle(node.id)}
            className="p-0.5 rounded text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer transition-colors shrink-0"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-4.5 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => onNavigate(node)}
          className={`flex-1 min-w-0 flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-left text-sm truncate cursor-pointer transition-colors ${
            activeId === node.id
              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300'
          } ${node.kind === 'collection' ? 'font-semibold' : ''}`}
        >
          {icon}
          <span className="truncate">{node.name}</span>
        </button>
      </div>

      {isBranch && expanded && node.children.length > 0 && (
        <div className="ml-3.5 border-l border-gray-200/80 dark:border-gray-700/70">
          {node.children.map(child => (
            <DocsTreeItem
              key={child.id}
              node={child}
              expandedIds={expandedIds}
              activeId={activeId}
              onToggle={onToggle}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DocsTree({ nodes, activeId, onNavigate }: Readonly<DocsTreeProps>) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(nodes.map(node => node.id)));

  const parentsById = useMemo(() => {
    const parents = new Map<string, string>();
    const walk = (children: DocsTreeNode[], parentId?: string) => {
      for (const node of children) {
        if (parentId) parents.set(node.id, parentId);
        walk(node.children, node.id);
      }
    };
    walk(nodes);
    return parents;
  }, [nodes]);

  // Always re-expand collapsed ancestors of the active row.
  useEffect(() => {
    if (!activeId) return;
    setExpandedIds(previous => {
      const missing: string[] = [];
      let cursor = parentsById.get(activeId);
      while (cursor) {
        if (!previous.has(cursor)) missing.push(cursor);
        cursor = parentsById.get(cursor);
      }
      if (missing.length === 0) return previous;
      const next = new Set(previous);
      missing.forEach(id => next.add(id));
      return next;
    });
  }, [activeId, parentsById]);

  const handleToggle = (nodeId: string) => {
    setExpandedIds(previous => {
      const next = new Set(previous);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-0.5">
      {nodes.map(node => (
        <DocsTreeItem
          key={node.id}
          node={node}
          expandedIds={expandedIds}
          activeId={activeId}
          onToggle={handleToggle}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}
