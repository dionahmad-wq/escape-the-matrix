import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { RawCatalogFile } from '../../src/domain/catalog';

export const ROOT = join(import.meta.dirname, '..', '..');
export const CATALOG_DIRS = ['data/seed', 'data/imports'];

/** Liest alle *.json-Katalogdateien aus data/seed und data/imports. */
export function readCatalogFiles(dirs: string[] = CATALOG_DIRS): RawCatalogFile[] {
  const files: RawCatalogFile[] = [];
  for (const dir of dirs) {
    const abs = join(ROOT, dir);
    if (!existsSync(abs)) continue;
    for (const entry of readdirSync(abs)) {
      if (!entry.endsWith('.json')) continue;
      const path = join(abs, entry);
      const name = relative(ROOT, path);
      try {
        files.push({ name, data: JSON.parse(readFileSync(path, 'utf8')) });
      } catch (err) {
        files.push({ name, data: { __parseError: (err as Error).message } });
      }
    }
  }
  return files;
}
