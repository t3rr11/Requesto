import type { OpenAPIV3, OpenAPIV2 } from 'openapi-types';

/**
 * Generate example values from an OpenAPI schema.
 * Handles basic types, objects, arrays. Circular refs return empty objects.
 */
export function generateExampleFromSchema(
  schema: OpenAPIV3.SchemaObject | OpenAPIV2.SchemaObject | undefined,
  visited: Set<object> = new Set(),
): unknown {
  if (!schema) return {};
  if (visited.has(schema)) return {};
  visited.add(schema);

  if ('example' in schema && schema.example !== undefined) return schema.example;

  if ('enum' in schema && schema.enum && schema.enum.length > 0) return schema.enum[0];

  const type = schema.type;
  if (type === 'object' || schema.properties) {
    const obj: Record<string, unknown> = {};
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if ('$ref' in propSchema) continue;
        obj[key] = generateExampleFromSchema(propSchema, visited);
      }
    }
    return obj;
  }

  if (type === 'array') {
    const items = (schema as OpenAPIV3.ArraySchemaObject).items;
    if (items && !('$ref' in items)) {
      return [generateExampleFromSchema(items, visited)];
    }
    return [];
  }

  if (type === 'string') {
    if ('format' in schema) {
      switch (schema.format) {
        case 'date': return '2024-01-01';
        case 'date-time': return '2024-01-01T00:00:00Z';
        case 'email': return 'user@example.com';
        case 'uri': return 'https://example.com';
        case 'uuid': return '00000000-0000-0000-0000-000000000000';
        case 'binary': return '';
      }
    }
    return 'string';
  }

  if (type === 'integer' || type === 'number') return 0;
  if (type === 'boolean') return false;

  return {};
}

export function resolveSchema(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined,
): OpenAPIV3.SchemaObject | undefined {
  if (!schema) return undefined;
  if ('$ref' in schema) return undefined;
  return schema;
}

export function resolveParam(
  param: OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject,
): OpenAPIV3.ParameterObject | undefined {
  if ('$ref' in param) return undefined;
  return param;
}

export function resolveParamArray(
  params?: (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[],
): (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[] {
  return params || [];
}
