/**
 * Erzeugt data/schema/question-catalog.schema.json aus dem Zod-Schema.
 * Editoren (z. B. VS Code) bieten damit Autovervollständigung beim Bearbeiten
 * der Katalogdateien, wenn diese "$schema": "../schema/question-catalog.schema.json" setzen.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import { CatalogFileObjectSchema, QuestionBaseSchema } from '../src/domain/schema';
import { ROOT } from './lib/catalogFiles';

// In Dateien dürfen `source`/`version` pro Frage fehlen (werden aus meta geerbt).
const FileSchemaForEditors = CatalogFileObjectSchema.extend({
  questions: z.array(QuestionBaseSchema.partial({ source: true })),
});
const schema = zodToJsonSchema(FileSchemaForEditors, { name: 'QuestionCatalog', $refStrategy: 'none' });
const out = join(ROOT, 'data/schema/question-catalog.schema.json');
writeFileSync(out, JSON.stringify(schema, null, 2) + '\n');
console.log(`✅ JSON-Schema geschrieben: ${out}`);
