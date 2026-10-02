import { randomUUID } from 'node:crypto';
import type { MockHttpMethod } from '../models/mock';

export interface CrudRequestContext {
  method: MockHttpMethod;
  params: Record<string, string>;
  body?: unknown;
  query: Record<string, unknown>;
}

export interface CrudResult {
  status: number;
  body: unknown;
}

type RecordWithId = Record<string, unknown> & { id?: unknown };

function isRecordWithId(value: unknown): value is RecordWithId {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordId(value: unknown): string {
  return String((value as RecordWithId).id);
}

function matchesQuery(record: RecordWithId, query: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(query)) {
    const recordValue = record[key];
    if (recordValue === undefined || String(recordValue) !== String(value)) {
      return false;
    }
  }
  return true;
}

function parseBody(body: unknown): RecordWithId {
  if (body === undefined || body === null || (typeof body === 'string' && body.trim() === '')) {
    throw new Error('Request body is required');
  }
  const parsed: unknown = typeof body === 'string' ? JSON.parse(body) : body;
  if (!isRecordWithId(parsed)) {
    throw new Error('Request body must be a JSON object');
  }
  return parsed;
}

/**
 * Execute a dynamic-mode (data-backed) request against an endpoint's dataset.
 * GET lists (optionally filtered by query params) or fetches by `:id`, POST
 * creates with a generated id, PUT/PATCH update, DELETE removes. Every
 * mutation is persisted through the `writeDataset` callback.
 */
export function handleDynamicRequest(
  context: CrudRequestContext,
  dataset: unknown[],
  writeDataset: (records: unknown[]) => void,
): CrudResult {
  const { method, params, body, query } = context;
  const hasIdParam = 'id' in params;

  switch (method) {
    case 'GET': {
      if (!hasIdParam) {
        const filtered = dataset.filter(
          (record) => isRecordWithId(record) && matchesQuery(record, query),
        );
        return { status: 200, body: filtered };
      }
      const found = dataset.find((r) => isRecordWithId(r) && recordId(r) === params.id);
      if (!found) return { status: 404, body: { error: 'Record not found' } };
      return { status: 200, body: found };
    }

    case 'POST': {
      let parsed: RecordWithId;
      try {
        parsed = parseBody(body);
      } catch (error) {
        return { status: 400, body: { error: error instanceof Error ? error.message : 'Invalid body' } };
      }
      const record = { ...parsed, id: parsed.id ?? randomUUID() };
      dataset.push(record);
      writeDataset([...dataset]);
      return { status: 201, body: record };
    }

    case 'PUT': {
      if (!hasIdParam) return { status: 405, body: { error: 'PUT requires an :id path parameter' } };
      let parsed: RecordWithId;
      try {
        parsed = parseBody(body);
      } catch (error) {
        return { status: 400, body: { error: error instanceof Error ? error.message : 'Invalid body' } };
      }
      const index = dataset.findIndex((r) => isRecordWithId(r) && recordId(r) === params.id);
      if (index === -1) return { status: 404, body: { error: 'Record not found' } };
      const updated = { ...parsed, id: params.id };
      dataset[index] = updated;
      writeDataset([...dataset]);
      return { status: 200, body: updated };
    }

    case 'PATCH': {
      if (!hasIdParam) return { status: 405, body: { error: 'PATCH requires an :id path parameter' } };
      let parsed: RecordWithId;
      try {
        parsed = parseBody(body);
      } catch (error) {
        return { status: 400, body: { error: error instanceof Error ? error.message : 'Invalid body' } };
      }
      const index = dataset.findIndex((r) => isRecordWithId(r) && recordId(r) === params.id);
      if (index === -1) return { status: 404, body: { error: 'Record not found' } };
      const updated = { ...(dataset[index] as RecordWithId), ...parsed, id: params.id };
      dataset[index] = updated;
      writeDataset([...dataset]);
      return { status: 200, body: updated };
    }

    case 'DELETE': {
      if (!hasIdParam) return { status: 405, body: { error: 'DELETE requires an :id path parameter' } };
      const index = dataset.findIndex((r) => isRecordWithId(r) && recordId(r) === params.id);
      if (index === -1) return { status: 404, body: { error: 'Record not found' } };
      const [removed] = dataset.splice(index, 1);
      writeDataset([...dataset]);
      return { status: 200, body: removed };
    }
  }
}


