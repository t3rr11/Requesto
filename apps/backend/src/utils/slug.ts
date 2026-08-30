import fs from 'node:fs';
import path from 'node:path';

/**
 * Convert a display name into a filesystem-safe slug used as the base name for
 * per-item data files (e.g. "My API!" -> "my-api").
 * Returns an empty string when the name contains no usable characters.
 */
export function slugify(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
}

/**
 * Resolve a unique file name for an item within `dir`, based on the slug of
 * `name`. Falls back to `id` when the slug is empty. If the candidate file
 * already exists and belongs to a different item (by its `id`), a numeric
 * suffix ("-2", "-3", ...) is appended. Returns the file name including the
 * `.json` extension.
 */
export function resolveUniqueFileName(dir: string, name: string, id: string): string {
  const base = slugify(name) || id;

  const readOwnerId = (fileName: string): string | null => {
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(path.join(dir, fileName), 'utf-8'));
      const itemId = (parsed as { id?: unknown } | null)?.id;
      return typeof itemId === 'string' ? itemId : null;
    } catch {
      return null;
    }
  };

  let candidate = `${base}.json`;
  let suffix = 2;
  while (fs.existsSync(path.join(dir, candidate)) && readOwnerId(candidate) !== id) {
    candidate = `${base}-${suffix}.json`;
    suffix += 1;
  }
  return candidate;
}
