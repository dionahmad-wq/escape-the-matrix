import { loadCatalog, type LoadedCatalog, type RawCatalogFile } from '@/domain/catalog';

/**
 * Lädt beim Build alle Katalogdateien aus data/seed und data/imports.
 * Neue JSON-Dateien in diesen Ordnern werden automatisch übernommen.
 */
const modules = import.meta.glob<{ default: unknown }>(['/data/seed/*.json', '/data/imports/*.json'], {
  eager: true,
});

const rawFiles: RawCatalogFile[] = Object.entries(modules).map(([path, mod]) => ({
  name: path.replace(/^\//, ''),
  data: mod.default,
}));

export const catalog: LoadedCatalog = loadCatalog(rawFiles);

if (import.meta.env.DEV && catalog.issues.length > 0) {
  console.warn(`[Katalog] ${catalog.issues.length} Hinweise beim Laden:`, catalog.issues);
}
