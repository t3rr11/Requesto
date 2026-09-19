import {
  getNamedType,
  isEnumType,
  isInputObjectType,
  isLeafType,
  isListType,
  isNonNullType,
  Kind,
  parse,
  print,
  type ArgumentNode,
  type DocumentNode,
  type FieldNode,
  type GraphQLField,
  type GraphQLInputType,
  type GraphQLObjectType,
  type GraphQLSchema,
  type GraphQLType,
  type OperationDefinitionNode,
  type SelectionSetNode,
  type ValueNode,
} from 'graphql';

export type GraphQLRootOperationKind = 'query' | 'mutation' | 'subscription';

// Circular schema types (e.g. User.friends -> [User]) would recurse forever,
// so expansion stops after this many levels.
const MAX_FIELD_DEPTH = 10;

/**
 * Build the selection set for a field's type by recursively expanding object
 * fields down to leaves (scalars/enums). Cyclic branches are omitted entirely
 * so the produced document stays valid.
 */
function buildLeafSelectionSet(
  type: GraphQLType,
  pathTypes: Set<string>,
  depth: number,
): SelectionSetNode | undefined {
  const named = getNamedType(type);
  if (isLeafType(named)) return undefined;
  if (pathTypes.has(named.name) || depth > MAX_FIELD_DEPTH) return undefined;

  const childPath = new Set(pathTypes);
  childPath.add(named.name);

  const selections: FieldNode[] = [];
  if ('getFields' in named) {
    for (const field of Object.values(named.getFields() as Record<string, GraphQLField<unknown, unknown>>)) {
      const childNamed = getNamedType(field.type);
      if (isLeafType(childNamed)) {
        selections.push({ kind: Kind.FIELD, name: { kind: Kind.NAME, value: field.name } });
        continue;
      }
      if (pathTypes.has(childNamed.name)) continue;
      const childSelection = buildLeafSelectionSet(field.type, childPath, depth + 1);
      if (!childSelection) continue;
      selections.push({
        kind: Kind.FIELD,
        name: { kind: Kind.NAME, value: field.name },
        selectionSet: childSelection,
      });
    }
  }

  return selections.length > 0 ? { kind: Kind.SELECTION_SET, selections } : undefined;
}

function buildFieldSelection(fieldName: string, rootType: GraphQLObjectType): FieldNode {
  const field = rootType.getFields()[fieldName] as GraphQLField<unknown, unknown> | undefined;
  const selectionSet = field ? buildLeafSelectionSet(field.type, new Set(), 1) : undefined;
  const requiredArgs: ArgumentNode[] = field
    ? field.args
        .filter(arg => isNonNullType(arg.type) && arg.defaultValue === undefined)
        .map(arg => ({
          kind: Kind.ARGUMENT,
          name: { kind: Kind.NAME, value: arg.name },
          value: buildPlaceholderValueNode(arg.type as GraphQLInputType, 0),
        }))
    : [];
  return {
    kind: Kind.FIELD,
    name: { kind: Kind.NAME, value: fieldName },
    ...(requiredArgs.length > 0 && { arguments: requiredArgs }),
    ...(selectionSet && { selectionSet }),
  };
}

// Guards against infinite recursion when required input fields reference
// each other cyclically.
const MAX_PLACEHOLDER_DEPTH = 5;

/** Build a placeholder value for a required field argument. */
function buildPlaceholderValueNode(type: GraphQLInputType, depth: number): ValueNode {
  if (isNonNullType(type)) return buildPlaceholderValueNode(type.ofType, depth);
  if (isListType(type)) return { kind: Kind.LIST, values: [] };

  const named = getNamedType(type);
  if (isEnumType(named)) {
    return { kind: Kind.ENUM, value: named.getValues()[0]?.name ?? 'PLACEHOLDER' };
  }
  if (isInputObjectType(named) && depth < MAX_PLACEHOLDER_DEPTH) {
    const requiredFields = Object.values(named.getFields()).filter(
      inputField => isNonNullType(inputField.type) && inputField.defaultValue === undefined,
    );
    return {
      kind: Kind.OBJECT,
      fields: requiredFields.map(inputField => ({
        kind: Kind.OBJECT_FIELD,
        name: { kind: Kind.NAME, value: inputField.name },
        value: buildPlaceholderValueNode(inputField.type as GraphQLInputType, depth + 1),
      })),
    };
  }

  switch (named.name) {
    case 'Int':
      return { kind: Kind.INT, value: '0' };
    case 'Float':
      return { kind: Kind.FLOAT, value: '0' };
    case 'Boolean':
      return { kind: Kind.BOOLEAN, value: false };
    default:
      // String, ID, and custom scalars
      return { kind: Kind.STRING, value: '' };
  }
}

function isFieldNode(selection: SelectionSetNode['selections'][number]): selection is FieldNode {
  return selection.kind === Kind.FIELD;
}

function isOperationNode(
  definition: DocumentNode['definitions'][number],
): definition is OperationDefinitionNode {
  return definition.kind === Kind.OPERATION_DEFINITION;
}

function hasField(operation: OperationDefinitionNode, fieldName: string): boolean {
  return operation.selectionSet?.selections.some(
    selection => isFieldNode(selection) && selection.name.value === fieldName,
  ) ?? false;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Append a root field (from the schema's query/mutation/subscription type) to
 * the first matching operation, creating it when missing, with subfields
 * expanded down to leaves and required arguments filled with placeholders.
 * Returns the original document unchanged when the field is already present.
 */
export function addFieldToGraphQLDocument(
  document: string,
  kind: GraphQLRootOperationKind,
  fieldName: string,
  schema: GraphQLSchema | null,
): string {
  const rootType = schema?.getRootType(kind);
  if (!rootType || !rootType.getFields()[fieldName]) {
    return document;
  }

  let definitions: DocumentNode['definitions'];
  if (!document.trim()) {
    definitions = [];
  } else {
    try {
      definitions = parse(document).definitions;
    } catch {
      throw new Error('Cannot add field: the current document has syntax errors');
    }
  }

  const existing = definitions.find(
    (definition): definition is OperationDefinitionNode =>
      isOperationNode(definition) && definition.operation === kind,
  );
  if (existing && hasField(existing, fieldName)) {
    return document;
  }

  const fieldNode = buildFieldSelection(fieldName, rootType);

  let updatedDefinitions: DocumentNode['definitions'];
  if (existing) {
    updatedDefinitions = definitions.map(definition =>
      definition === existing
        ? {
            ...existing,
            selectionSet: {
              kind: Kind.SELECTION_SET,
              selections: [...(existing.selectionSet?.selections ?? []), fieldNode],
            },
          }
        : definition,
    );
  } else {
    // GraphQL allows at most one anonymous operation per document.
    const needsName = definitions.some(isOperationNode);
    updatedDefinitions = [
      ...definitions,
      buildOperationNode(kind, fieldNode, needsName),
    ];
  }

  return print({ kind: Kind.DOCUMENT, definitions: updatedDefinitions });
}

function buildOperationNode(
  kind: OperationDefinitionNode['operation'],
  fieldNode: FieldNode,
  needsName: boolean,
): OperationDefinitionNode {
  return {
    kind: Kind.OPERATION_DEFINITION,
    operation: kind,
    ...(needsName && {
      name: { kind: Kind.NAME, value: `${capitalize(fieldNode.name.value)}${capitalize(kind)}` },
    }),
    selectionSet: { kind: Kind.SELECTION_SET, selections: [fieldNode] },
  };
}
