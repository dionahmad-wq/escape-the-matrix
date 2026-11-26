/**
 * Importiert einen Fragenkatalog (CSV oder JSON) in das normalisierte Format.
 *
 *   npm run import -- --in pfad/katalog.csv --id lizenz-2026 --title "Amtlicher Katalog" \
 *                     [--source official] [--version 2026-10] [--license "…"] \
 *                     [--choice-type multiple|auto] [--out data/imports/lizenz-2026.json] [--dry-run]
 *
 * Ungültige Zeilen werden gemeldet und übersprungen. Die Ausgabe landet standardmäßig in
 * data/imports/ (per .gitignore vom Repository ausgeschlossen, damit lizenzierte Inhalte
 * nicht versehentlich veröffentlicht werden).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import Papa from 'papaparse';
import { importFlatRecords, importJson, type ImportOptions } from '../src/domain/importMapping';
import { CatalogFileSchema, QuestionSourceSchema } from '../src/domain/schema';
import type { CatalogFileInput } from '../src/domain/types';
import { ROOT } from './lib/catalogFiles';

const { values } = parseArgs({
  options: {
    in: { type: 'string' },
    out: { type: 'string' },
    id: { type: 'string' },
    title: { type: 'string' },
    source: { type: 'string', default: 'official' },
    version: { type: 'string' },
    license: { type: 'string' },
    'choice-type': { type: 'string', default: 'multiple' },
    delimiter: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
  },
});

function fail(msg: string): never {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

if (!values.in) fail('Bitte --in <datei.csv|datei.json> angeben');
const input = resolve(values.in);
const id = values.id ?? 'import';
const source = QuestionSourceSchema.safeParse(values.source);
if (!source.success) fail('--source muss seed, official oder custom sein');
const choiceType = values['choice-type'];
if (choiceType !== 'multiple' && choiceType !== 'auto') fail('--choice-type muss multiple oder auto sein');

const options: ImportOptions = { source: source.data, version: values.version, defaultChoiceType: choiceType };
const raw = readFileSync(input, 'utf8').replace(/^﻿/, '');

const result =
  extname(input).toLowerCase() === '.csv'
    ? (() => {
        const parsed = Papa.parse<Record<string, string>>(raw, {
          header: true,
          skipEmptyLines: 'greedy',
          delimiter: values.delimiter ?? '', // leer = automatisch erkennen (, oder ;)
        });
        for (const e of parsed.errors) console.warn(`⚠️  CSV Zeile ${(e.row ?? 0) + 2}: ${e.message}`);
        return importFlatRecords(parsed.data, options);
      })()
    : importJson(JSON.parse(raw), options);

for (const e of result.errors) {
  console.warn(`⚠️  Datensatz ${e.row}${e.id ? ` (${e.id})` : ''}: ${e.message}`);
}

const catalog: CatalogFileInput = {
  $schema: '../schema/question-catalog.schema.json',
  meta: {
    id,
    title: values.title ?? `Import ${id}`,
    version: values.version ?? new Date().toISOString().slice(0, 10),
    source: source.data,
    license: values.license,
  },
  questions: result.questions,
};
// Endkontrolle mit dem Datei-Schema
const check = CatalogFileSchema.safeParse(catalog);
if (!check.success) fail(`Ergebnis ungültig: ${check.error.message}`);

console.log(`\n✅ ${result.questions.length} Fragen übernommen, ${new Set(result.errors.map((e) => e.row)).size} Datensätze übersprungen`);

if (values['dry-run']) {
  console.log('(Probelauf, nichts geschrieben)');
} else {
  const out = values.out ? resolve(values.out) : join(ROOT, 'data/imports', `${id}.json`);
  writeFileSync(out, JSON.stringify(catalog, null, 2) + '\n');
  console.log(`💾 Geschrieben: ${out}\n   Danach: npm run validate`);
}
