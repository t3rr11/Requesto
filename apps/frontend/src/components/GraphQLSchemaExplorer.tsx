import { useEffect, useState } from 'react';
import {
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isUnionType,
  type GraphQLNamedType,
  type GraphQLObjectType,
  type GraphQLArgument,
  type GraphQLSchema,
  type GraphQLType,
} from 'graphql';
import { RefreshCw, Search } from 'lucide-react';
import { Button } from './Button';

interface GraphQLSchemaExplorerProps {
  schema: GraphQLSchema | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  disabled?: boolean;
}

export function GraphQLSchemaExplorer({
  schema,
  loading,
  error,
  onRefresh,
  disabled = false,
}: Readonly<GraphQLSchemaExplorerProps>) {
  const [search, setSearch] = useState('');
  const [selectedTypeName, setSelectedTypeName] = useState<string | null>(null);

  useEffect(() => {
    setSelectedTypeName(schema?.getQueryType()?.name ?? null);
  }, [schema]);

  const rootTypes = schema
    ? [schema.getQueryType(), schema.getMutationType(), schema.getSubscriptionType()].filter(
      (type): type is GraphQLObjectType => type != null,
      )
    : [];
  const normalizedSearch = search.trim().toLowerCase();
  const types = schema
    ? Object.values(schema.getTypeMap())
        .filter(type => !type.name.startsWith('__'))
        .filter(type => !normalizedSearch || type.name.toLowerCase().includes(normalizedSearch))
        .sort((left, right) => left.name.localeCompare(right.name))
    : [];
  const selectedType = selectedTypeName && schema ? schema.getType(selectedTypeName) : undefined;

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
              <div className="px-3 pb-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Types</div>
              {types.map(type => (
                <TypeButton
                  key={type.name}
                  type={type}
                  selected={selectedTypeName === type.name}
                  onSelect={setSelectedTypeName}
                />
              ))}
            </div>
          </div>
          <div className="overflow-y-auto p-4">
            {selectedType ? (
              <TypeDetails type={selectedType} onSelectType={setSelectedTypeName} />
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
}

function TypeDetails({ type, onSelectType }: Readonly<TypeDetailsProps>) {
  const fields = isObjectType(type) || isInterfaceType(type) || isInputObjectType(type)
    ? Object.values(type.getFields())
    : [];

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
                <div className="flex flex-wrap items-baseline gap-2 text-sm">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{field.name}</span>
                  <button
                    type="button"
                    onClick={() => onSelectType(namedType.name)}
                    className="font-mono text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {String(field.type)}
                  </button>
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
