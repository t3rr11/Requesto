import { useEffect, useMemo, useState } from 'react';
import {
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isUnionType,
  type GraphQLArgument,
  type GraphQLNamedType,
  type GraphQLObjectType,
  type GraphQLSchema,
  type GraphQLType,
} from 'graphql';
import { ChevronDown, ChevronRight, List, ListTree, Plus, RefreshCw, Search } from 'lucide-react';
import { Button } from './Button';
import type { GraphQLRootOperationKind } from '../helpers/graphqlDocument';

interface GraphQLSchemaExplorerProps {
  schema: GraphQLSchema | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  disabled?: boolean;
  onAddField?: (kind: GraphQLRootOperationKind, fieldName: string) => void;
}

type TypesViewMode = 'list' | 'tree';

export function GraphQLSchemaExplorer({
  schema,
  loading,
  error,
  onRefresh,
  disabled = false,
  onAddField,
}: Readonly<GraphQLSchemaExplorerProps>) {
  const [search, setSearch] = useState('');
  const [selectedTypeName, setSelectedTypeName] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<TypesViewMode>('list');

  useEffect(() => {
    setSelectedTypeName(schema?.getQueryType()?.name ?? null);
  }, [schema]);

  const rootTypes = schema
    ? [schema.getQueryType(), schema.getMutationType(), schema.getSubscriptionType()].filter(
      (type): type is GraphQLObjectType => type != null,
      )
    : [];
  const normalizedSearch = search.trim().toLowerCase();
  const types = useMemo(
    () =>
      schema
        ? Object.values(schema.getTypeMap())
            .filter(type => !type.name.startsWith('__'))
            .filter(type => !normalizedSearch || type.name.toLowerCase().includes(normalizedSearch))
            .sort((left, right) => left.name.localeCompare(right.name))
        : [],
    [schema, normalizedSearch],
  );
  const selectedType = selectedTypeName && schema ? schema.getType(selectedTypeName) : undefined;
  const rootKindByName = useMemo(() => {
    const names = new Map<string, GraphQLRootOperationKind>();
    if (!schema) return names;
    for (const kind of ['query', 'mutation', 'subscription'] as const) {
      const rootType = schema.getRootType(kind);
      if (rootType) names.set(rootType.name, kind);
    }
    return names;
  }, [schema]);
  const selectedRootKind = selectedTypeName ? rootKindByName.get(selectedTypeName) : undefined;

  return (
    <div className="h-full min-h-50 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            aria-label="Search schema types"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search schema types"
            disabled={!schema || loading}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 bg-transparent text-gray-900 dark:text-gray-100 disabled:opacity-60"
          />
        </div>
        <Button onClick={onRefresh} variant="secondary" size="sm" loading={loading} disabled={disabled}>
          <RefreshCw className="h-4 w-4" />
          {schema ? 'Refresh' : 'Fetch schema'}
        </Button>
      </div>

      {error && (
        <div role="alert" className="border-l-2 border-red-500 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {!schema && !loading && !error && (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
          No schema loaded
        </div>
      )}

      {schema && (
        <div className="flex-1 min-h-0 grid grid-cols-[minmax(11rem,0.35fr)_minmax(0,1fr)] border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
          <div className="overflow-y-auto border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            {rootTypes.length > 0 && (
              <div className="py-2 border-b border-gray-200 dark:border-gray-700">
                <div className="px-3 pb-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Operations</div>
                {rootTypes.map(type => (
                  <TypeButton
                    key={type.name}
                    type={type}
                    selected={selectedTypeName === type.name}
                    onSelect={setSelectedTypeName}
                  />
                ))}
              </div>
            )}
            <div className="py-2">
              <div className="px-3 pb-1 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Types</span>
                <div className="flex items-center rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <button
                    type="button"
                    aria-label="List view"
                    aria-pressed={viewMode === 'list'}
                    onClick={() => setViewMode('list')}
                    className={`p-1 ${viewMode === 'list' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Tree view"
                    aria-pressed={viewMode === 'tree'}
                    onClick={() => setViewMode('tree')}
                    className={`p-1 ${viewMode === 'tree' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}
                  >
                    <ListTree className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {viewMode === 'list' ? (
                types.map(type => (
                  <TypeButton
                    key={type.name}
                    type={type}
                    selected={selectedTypeName === type.name}
                    onSelect={setSelectedTypeName}
                  />
                ))
              ) : (
                <TypeTree
                  schema={schema}
                  types={types}
                  selectedTypeName={selectedTypeName}
                  onSelectType={setSelectedTypeName}
                />
              )}
            </div>
          </div>
          <div className="overflow-y-auto p-4">
            {selectedType ? (
              <TypeDetails
                type={selectedType}
                onSelectType={setSelectedTypeName}
                rootKind={selectedRootKind}
                onAddField={
                  selectedRootKind && onAddField ? (fieldName: string) => onAddField(selectedRootKind, fieldName) : undefined
                }
              />
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">Select a type</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface TypeButtonProps {
  type: GraphQLNamedType;
  selected: boolean;
  onSelect: (name: string) => void;
}

function TypeButton({ type, selected, onSelect }: Readonly<TypeButtonProps>) {
  return (
    <button
      type="button"
      onClick={() => onSelect(type.name)}
      className={`w-full px-3 py-1.5 text-left text-sm ${
        selected
          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
      }`}
    >
      {type.name}
    </button>
  );
}

interface TypeTreeNodeData {
  id: string;
  label: string;
  typeText?: string;
  typeName?: string;
}

function getTypeChildren(type: GraphQLNamedType): TypeTreeNodeData[] | null {
  if (isObjectType(type) || isInterfaceType(type) || isInputObjectType(type)) {
    return Object.values(type.getFields()).map(field => {
      const namedType = unwrapType(field.type);
      return {
        id: `field:${field.name}:${namedType.name}`,
        label: field.name,
        typeText: String(field.type),
        typeName: namedType.name,
      };
    });
  }
  if (isUnionType(type)) {
    return type.getTypes().map(member => ({ id: `member:${member.name}`, label: member.name, typeName: member.name }));
  }
  if (isEnumType(type)) {
    return type.getValues().map(value => ({ id: `value:${value.name}`, label: value.name }));
  }
  return null;
}

// Depth cap guards against runaway nesting when a circular schema is fully expanded.
const MAX_TREE_DEPTH = 15;

interface TypeTreeProps {
  schema: GraphQLSchema;
  types: GraphQLNamedType[];
  selectedTypeName: string | null;
  onSelectType: (name: string) => void;
}

function TypeTree({ schema, types, selectedTypeName, onSelectType }: Readonly<TypeTreeProps>) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpandedIds(previous => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="py-0.5">
      {types.map(type => (
        <TypeTreeTypeNode
          key={`type:${type.name}`}
          schema={schema}
          node={{ id: `type:${type.name}`, label: type.name, typeName: type.name }}
          depth={0}
          ancestors={new Set()}
          expandedIds={expandedIds}
          onToggle={toggle}
          onSelectType={onSelectType}
          selectedTypeName={selectedTypeName}
        />
      ))}
    </div>
  );
}

interface TypeTreeTypeNodeProps {
  schema: GraphQLSchema;
  node: TypeTreeNodeData & { typeName: string };
  depth: number;
  ancestors: Set<string>;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectType: (name: string) => void;
  selectedTypeName: string | null;
}

function TypeTreeTypeNode({
  schema,
  node,
  depth,
  ancestors,
  expandedIds,
  onToggle,
  onSelectType,
  selectedTypeName,
}: Readonly<TypeTreeTypeNodeProps>) {
  const type = schema.getType(node.typeName);
  if (!type) return null;

  const children = getTypeChildren(type);
  const isExpanded = expandedIds.has(node.id);
  // Cyclic reference: keep it visible but prevent re-expanding its ancestors.
  const isCyclic = ancestors.has(node.typeName);
  const canExpand = children != null && children.length > 0 && !isCyclic && depth < MAX_TREE_DEPTH;
  const childAncestors = new Set(ancestors);
  childAncestors.add(node.typeName);

  return (
    <div>
      <div className="flex items-center" style={{ paddingLeft: depth * 12 }}>
        {canExpand ? (
          <button
            type="button"
            aria-label={isExpanded ? `Collapse ${node.label}` : `Expand ${node.label}`}
            onClick={() => onToggle(node.id)}
            className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0 cursor-pointer"
          >
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => onSelectType(node.typeName)}
          className={`flex-1 min-w-0 truncate py-1 pr-3 text-left text-sm ${
            selectedTypeName === node.typeName
              ? 'text-blue-700 dark:text-blue-300'
              : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100'
          }`}
        >
          {node.label}
          {node.typeText && <span className="font-mono text-xs text-gray-400 dark:text-gray-500">: {node.typeText}</span>}
        </button>
      </div>
      {isExpanded &&
        canExpand &&
        children?.map(child =>
          child.typeName ? (
            <TypeTreeTypeNode
              key={child.id}
              schema={schema}
              node={child as TypeTreeNodeData & { typeName: string }}
              depth={depth + 1}
              ancestors={childAncestors}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelectType={onSelectType}
              selectedTypeName={selectedTypeName}
            />
          ) : (
            <div
              key={child.id}
              className="truncate py-0.5 pr-3 text-sm text-gray-500 dark:text-gray-400"
              style={{ paddingLeft: depth * 12 + 20 }}
            >
              {child.label}
            </div>
          ),
        )}
    </div>
  );
}

function unwrapType(type: GraphQLType): GraphQLNamedType {
  let current = type;
  while (isListType(current) || isNonNullType(current)) {
    current = current.ofType;
  }
  return current;
}

interface TypeDetailsProps {
  type: GraphQLNamedType;
  onSelectType: (name: string) => void;
  onAddField?: (fieldName: string) => void;
  rootKind?: GraphQLRootOperationKind;
}

function TypeDetails({ type, onSelectType, onAddField, rootKind }: Readonly<TypeDetailsProps>) {
  const fields = isObjectType(type) || isInterfaceType(type) || isInputObjectType(type)
    ? Object.values(type.getFields())
    : [];
  const addLabel = rootKind === 'mutation' ? 'Add to mutation' : rootKind === 'subscription' ? 'Add to subscription' : 'Add to query';

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{type.name}</h3>
        {type.description && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{type.description}</p>}
      </div>

      {fields.length > 0 && (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {fields.map(field => {
            const namedType = unwrapType(field.type);
            const args: readonly GraphQLArgument[] = 'args' in field ? field.args : [];
            return (
              <div key={field.name} className="py-3 first:pt-0">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 flex flex-wrap items-baseline gap-2 text-sm">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{field.name}</span>
                    <button
                      type="button"
                      onClick={() => onSelectType(namedType.name)}
                      className="font-mono text-xs text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {String(field.type)}
                    </button>
                  </div>
                  {onAddField && addLabel && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Add ${field.name} to ${rootKind}`}
                      onClick={() => onAddField(field.name)}
                      className="shrink-0 self-start text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {addLabel}
                    </Button>
                  )}
                </div>
                {args.length > 0 && (
                  <div className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400">
                    {args.map(argument => `${argument.name}: ${String(argument.type)}`).join(', ')}
                  </div>
                )}
                {field.description && <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{field.description}</p>}
                {'deprecationReason' in field && field.deprecationReason && (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Deprecated: {field.deprecationReason}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isEnumType(type) && (
        <div className="space-y-2">
          {type.getValues().map(value => (
            <div key={value.name} className="text-sm">
              <span className="font-mono text-gray-900 dark:text-gray-100">{value.name}</span>
              {value.description && <p className="text-xs text-gray-600 dark:text-gray-400">{value.description}</p>}
            </div>
          ))}
        </div>
      )}

      {isUnionType(type) && (
        <div className="flex flex-wrap gap-2">
          {type.getTypes().map(member => (
            <button
              key={member.name}
              type="button"
              onClick={() => onSelectType(member.name)}
              className="font-mono text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              {member.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
