import { memo } from 'react';
import { Folder, Package } from 'lucide-react';
import { MethodBadge } from '../sidebar/MethodBadge';
import type { DocsSectionData, DocsNodeKind } from './DocsTreeHelpers';
import { DocsPreview } from './DocsPreview';
import { DocsEditor } from '../docs-editor/DocsEditor';

interface DocsSectionProps {
  section: DocsSectionData;
  prevKind?: DocsNodeKind;
  isEditing: boolean;
  staged: Map<string, string>;
  onStage: (nodeId: string, markdown: string) => void;
  registerSection: (nodeId: string, element: HTMLDivElement | null) => void;
}

function withoutRepeatedTitle(markdown: string, title: string): string {
  const match = markdown.match(/^\s*#\s+(.+?)[ \t]*(?:\r?\n|$)/);
  const repeatsTitle =
    match !== null && match[1].trim().localeCompare(title.trim(), undefined, { sensitivity: 'base' }) === 0;
  return repeatsTitle && match ? markdown.slice(match[0].length) : markdown;
}

/**
 * One anchor of the continuous reading view. Collections open a chapter over a
 * hairline rule, folders are small-caps labels, and consecutive requests are
 * separated by a hairline.
 */
export const DocsSection = memo(function DocsSection({
  section,
  prevKind,
  isEditing,
  staged,
  onStage,
  registerSection,
}: DocsSectionProps) {
  const { node } = section;
  const markdown = staged.get(node.id) ?? node.markdown;

  const unsavedDot =
    node.kind === 'request' && staged.has(node.id) && staged.get(node.id) !== node.markdown ? (
      <span title="Unsaved changes" className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
    ) : null;

  const wrapperClass =
    node.kind === 'collection'
      ? 'mt-14 first:mt-0'
      : node.kind === 'folder'
        ? 'mt-9'
        : prevKind === 'folder'
          ? 'mt-3 first:mt-0'
          : prevKind === 'request'
            ? 'mt-6 pt-6 border-t border-gray-200 dark:border-gray-800'
            : 'mt-6 first:mt-0';

  const body = isEditing ? markdown : withoutRepeatedTitle(markdown, node.name);
  const hasBody = body.trim().length > 0;
  const hasDocument = markdown.trim().length > 0;

  return (
    <div ref={element => registerSection(node.id, element)} data-section-id={node.id} className={wrapperClass}>
      {node.kind === 'collection' && (
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-gray-200 dark:border-gray-700/60">
          <Package className="w-5 h-5 text-orange-500 dark:text-orange-400 shrink-0" />
          <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">{node.name}</h2>
        </div>
      )}

      {node.kind === 'folder' && (
        <div className="flex items-center gap-2">
          <Folder className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">
            {node.name}
          </span>
        </div>
      )}

      {node.kind === 'request' && (
        <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-2.5 items-center">
          <div className="flex items-center min-w-0">{node.badge && <MethodBadge method={node.badge} />}</div>
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{node.name}</h3>
            {unsavedDot}
            {section.crumb && (
              <span className="ml-auto hidden sm:block pl-4 text-[11px] text-gray-400 dark:text-gray-500/80 truncate">
                {section.crumb}
              </span>
            )}
          </div>
          {isEditing ? (
            <div className="col-start-2 pt-2 min-w-0">
              <DocsEditor value={markdown} onChange={next => onStage(node.id, next)} />
            </div>
          ) : hasBody ? (
            <div className="col-start-2 pt-1 min-w-0">
              <DocsPreview markdown={body} />
            </div>
          ) : (
            !hasDocument && (
              <p className="col-start-2 pt-0.5 text-sm italic text-gray-400 dark:text-gray-500">No documentation yet.</p>
            )
          )}
        </div>
      )}
    </div>
  );
});
