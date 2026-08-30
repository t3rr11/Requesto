import fs from 'node:fs';
import path from 'node:path';
import { atomicWrite } from './file';

/**
 * Sections of the workspace order manifest (`.requesto/order.json`).
 * Each section lists item ids in display order for one data type
 * (collections, environments, oauth configs, GraphQL schema profiles).
 */
export type OrderSection = 'collections' | 'environments' | 'oauthConfigs' | 'graphqlSchemas';

export type OrderManifest = Partial<Record<OrderSection, string[]>>;

function getOrderFile(dataDir: string): string {
  return path.join(dataDir, 'order.json');
}

function readOrder(dataDir: string): OrderManifest {
  try {
    const filePath = getOrderFile(dataDir);
    if (!fs.existsSync(filePath)) return {};
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as OrderManifest;
  } catch (error) {
    console.error('Error reading order manifest:', error);
    return {};
  }
}

/** Read the ordered id list for one section. */
export function readOrderSection(dataDir: string, section: OrderSection): string[] {
  const ids = readOrder(dataDir)[section];
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
}

/** Update a single section of the order manifest, preserving the other sections. */
export function writeOrderSection(dataDir: string, section: OrderSection, ids: string[]): void {
  const manifest = readOrder(dataDir);
  manifest[section] = ids;
  atomicWrite(getOrderFile(dataDir), manifest);
}

/** Remove an id from every section of the order manifest (used when deleting items). */
export function removeIdFromOrder(dataDir: string, id: string): void {
  const manifest = readOrder(dataDir);
  let changed = false;
  for (const section of Object.keys(manifest) as OrderSection[]) {
    const ids = manifest[section];
    if (Array.isArray(ids) && ids.includes(id)) {
      manifest[section] = ids.filter((existing) => existing !== id);
      changed = true;
    }
  }
  if (changed) {
    atomicWrite(getOrderFile(dataDir), manifest);
  }
}
