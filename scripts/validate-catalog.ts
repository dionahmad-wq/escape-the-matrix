/**
 * Prüft alle Katalogdateien in data/seed und data/imports.
 *   npm run validate            → Bericht, Exit-Code 1 bei Fehlern
 *   npm run validate -- --strict → Warnungen zählen ebenfalls als Fehler
 */
import { computeCatalogStats, loadCatalog } from '../src/domain/catalog';
import { CATEGORIES } from '../src/domain/categories';
import type { CategoryId } from '../src/domain/types';
import { readCatalogFiles } from './lib/catalogFiles';

const strict = process.argv.includes('--strict');
const catalog = loadCatalog(readCatalogFiles());
const stats = computeCatalogStats(catalog.questions);

console.log('\n📚 Fragenkatalog\n');
for (const f of catalog.files) {
  console.log(`  ${f.name.padEnd(40)} ${String(f.count).padStart(5)} Fragen  (${f.meta.source}, v${f.meta.version})`);
}
console.log(`\n  Gesamt: ${stats.total} Fragen, davon ${stats.withMedia} mit Bild/Medien`);
console.log(`  Grundstoff: ${stats.byMaterial.grundstoff ?? 0} · Zusatzstoff: ${stats.byMaterial.zusatzstoff ?? 0}`);
console.log(
  `  Typen: ${Object.entries(stats.byType).map(([k, v]) => `${k}=${v}`).join(', ')} · Punkte: ${Object.entries(stats.byPoints)
    .map(([k, v]) => `${k}P=${v}`)
    .join(', ')}`,
);
console.log('  Kategorien:');
for (const [cat, n] of Object.entries(stats.byCategory)) {
  console.log(`    ${CATEGORIES[cat as CategoryId].label.padEnd(32)} ${n}`);
}

const errors = catalog.issues.filter((i) => i.severity === 'error');
const warnings = catalog.issues.filter((i) => i.severity === 'warning');
for (const i of catalog.issues) {
  const icon = i.severity === 'error' ? '❌' : '⚠️ ';
  console.log(`${icon} ${i.file} ${i.path}${i.questionId ? ` (${i.questionId})` : ''}: ${i.message}`);
}

const failed = errors.length > 0 || (strict && warnings.length > 0);
console.log(`\n${failed ? '❌' : '✅'} ${errors.length} Fehler, ${warnings.length} Warnungen\n`);
process.exit(failed ? 1 : 0);
