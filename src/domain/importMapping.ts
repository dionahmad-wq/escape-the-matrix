import { categoryFromOfficialSection } from './categories';
import { CatalogFileSchema, OFFICIAL_NUMBER_PATTERN, QuestionSchema } from './schema';
import type { Question, QuestionInput, QuestionSource } from './types';

/**
 * Wandelt flache Datensätze (CSV-Zeilen oder lose JSON-Objekte) in das
 * normalisierte Fragenformat um. Fehlende Felder werden, wo möglich, aus der
 * amtlichen Fragenummer abgeleitet:
 *   "1.3.01-002" → Grundstoff (1.x), Kategorie Vorfahrt (x.3)
 *   "2.7.01-101" → Zusatzstoff (2.x), Kategorie Technik (x.7)
 */

export interface ImportOptions {
  source: QuestionSource;
  version?: string;
  /** Standard-Lizenzklassen, falls die Spalte fehlt. */
  licenseClasses?: string[];
  /**
   * Fragetyp für Auswahlfragen ohne Typangabe. "multiple" entspricht der echten
   * Prüfung (es wird nicht verraten, wie viele Antworten richtig sind).
   * "auto" wählt "single" bei genau einer richtigen Antwort.
   */
  defaultChoiceType?: 'multiple' | 'auto';
}

export interface ImportRowError {
  row: number;
  id?: string;
  message: string;
}

export interface ImportResult {
  questions: Question[];
  errors: ImportRowError[];
}

/** Spaltennamen (normalisiert) → Feldname. Erlaubt auch deutsche Spaltenköpfe. */
const HEADER_ALIASES: Record<string, string> = {
  nummer: 'officialnumber',
  fragenummer: 'officialnumber',
  frage: 'text',
  fragetext: 'text',
  kategorie: 'category',
  thema: 'category',
  unterkategorie: 'subcategory',
  unterthema: 'subcategory',
  stoff: 'material',
  typ: 'type',
  punkte: 'points',
  klassen: 'licenseclasses',
  erklaerung: 'explanation',
  erklarung: 'explanation',
  loesung: 'explanation',
  eselsbruecke: 'mnemonic',
  merksatz: 'mnemonic',
  bild: 'mediasrc',
  bildbeschreibung: 'mediaplaceholder',
  zahl: 'numbervalue',
  einheit: 'numberunit',
};

const TRUTHY = new Set(['1', 'true', 'x', 'ja', 'j', 'wahr', 'richtig', 'yes', 'y']);
const LIST_SEPARATOR = /[|;,]/;

function normalizeKey(key: string): string {
  const k = key
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
  return HEADER_ALIASES[k] ?? k;
}

function normalizeRow(row: Record<string, unknown>): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined || value === null) continue;
    const str = String(value).trim();
    if (str !== '') out.set(normalizeKey(key), str);
  }
  return out;
}

function parseNumber(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

function parseList(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const list = raw.split(LIST_SEPARATOR).map((s) => s.trim()).filter(Boolean);
  return list.length ? list : undefined;
}

function parseMaterial(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const r = raw.toLowerCase();
  if (r.startsWith('g')) return 'grundstoff';
  if (r.startsWith('z')) return 'zusatzstoff';
  return r;
}

/** Wandelt einen flachen Datensatz in ein (noch ungeprüftes) Frage-Objekt um. */
export function mapFlatRecord(record: Record<string, unknown>, options: ImportOptions): QuestionInput {
  const r = normalizeRow(record);
  const officialNumber = r.get('officialnumber');
  const official = officialNumber && OFFICIAL_NUMBER_PATTERN.test(officialNumber) ? officialNumber : undefined;
  const [majorStr, sectionStr] = official ? official.split('.') : [];

  const category =
    r.get('category')?.toLowerCase() ??
    (sectionStr ? categoryFromOfficialSection(Number(sectionStr)) : undefined);
  const material =
    parseMaterial(r.get('material')) ??
    (majorStr === '1' ? 'grundstoff' : majorStr === '2' ? 'zusatzstoff' : undefined);

  // Antworten: answer1..answer5 (+ answer1correct, answer1explanation)
  const answers: NonNullable<QuestionInput['answers']> = [];
  for (let i = 1; i <= 5; i++) {
    const text = r.get(`answer${i}`) ?? r.get(`antwort${i}`);
    if (!text) continue;
    const correctRaw = (r.get(`answer${i}correct`) ?? r.get(`antwort${i}richtig`) ?? '').toLowerCase();
    answers.push({
      id: String.fromCharCode(96 + i), // a, b, c …
      text,
      correct: TRUTHY.has(correctRaw),
      explanation: r.get(`answer${i}explanation`) ?? r.get(`antwort${i}erklarung`),
    });
  }

  const numberValue = parseNumber(r.get('numbervalue'));
  let type = r.get('type')?.toLowerCase();
  if (!type) {
    if (numberValue !== undefined) type = 'number';
    else if (options.defaultChoiceType === 'auto') {
      type = answers.filter((a) => a.correct).length === 1 ? 'single' : 'multiple';
    } else type = 'multiple';
  }

  const mediaPlaceholder = r.get('mediaplaceholder');
  const mediaSrc = r.get('mediasrc');
  const media =
    mediaPlaceholder || mediaSrc
      ? {
          kind: (r.get('mediakind') ?? (r.get('signnumber') ? 'sign' : 'image')) as 'image' | 'video' | 'sign',
          src: mediaSrc,
          placeholder: mediaPlaceholder ?? 'Abbildung zur Frage',
          alt: r.get('mediaalt') ?? mediaPlaceholder ?? 'Abbildung zur Frage',
          signNumber: r.get('signnumber'),
        }
      : undefined;

  const id = r.get('id') ?? (official ? `off-${official}` : undefined);

  const question: Record<string, unknown> = {
    id,
    officialNumber: official,
    category,
    // Ohne Unterthema-Spalte: Abschnitt der amtlichen Nummer verwenden (z. B. „Abschnitt 1.3.01“)
    subcategory: r.get('subcategory') ?? (official ? `Abschnitt ${official.split('-')[0]}` : undefined),
    material,
    licenseClasses: parseList(r.get('licenseclasses')) ?? options.licenseClasses ?? ['B'],
    type,
    points: parseNumber(r.get('points')),
    text: r.get('text'),
    media,
    answers: type === 'number' ? undefined : answers,
    numberAnswer:
      type === 'number' && numberValue !== undefined
        ? {
            value: numberValue,
            unit: r.get('numberunit'),
            tolerance: parseNumber(r.get('numbertolerance')),
            prefix: r.get('numberprefix'),
          }
        : undefined,
    explanation: r.get('explanation'),
    mnemonic: r.get('mnemonic'),
    tags: parseList(r.get('tags')),
    source: options.source,
    version: r.get('version') ?? options.version,
  };

  // undefined-Felder entfernen, damit die Ausgabe-JSON sauber bleibt
  return JSON.parse(JSON.stringify(question)) as QuestionInput;
}

/** Bildet flache Datensätze ab und prüft sie. Ungültige Zeilen landen in `errors`. */
export function importFlatRecords(records: Record<string, unknown>[], options: ImportOptions): ImportResult {
  const questions: Question[] = [];
  const errors: ImportRowError[] = [];
  const seen = new Set<string>();

  records.forEach((record, index) => {
    const row = index + 1;
    const mapped = mapFlatRecord(record, options);
    const result = QuestionSchema.safeParse(mapped);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({ row, id: mapped.id, message: `${issue.path.join('.') || '(Frage)'}: ${issue.message}` });
      }
      return;
    }
    if (seen.has(result.data.id)) {
      errors.push({ row, id: result.data.id, message: 'Doppelte ID im Import' });
      return;
    }
    seen.add(result.data.id);
    questions.push(result.data);
  });

  return { questions, errors };
}

/**
 * Nimmt beliebigen JSON-Inhalt entgegen:
 *  - eine fertige Katalogdatei ({ meta, questions }) → wird direkt geprüft
 *  - ein Array von Fragen im Zielformat oder in flacher Form → wird abgebildet
 */
export function importJson(data: unknown, options: ImportOptions): ImportResult {
  if (data && typeof data === 'object' && !Array.isArray(data) && 'questions' in data) {
    const asCatalog = CatalogFileSchema.safeParse(data);
    if (asCatalog.success) return { questions: asCatalog.data.questions, errors: [] };
    data = (data as { questions: unknown }).questions;
  }
  if (!Array.isArray(data)) {
    return { questions: [], errors: [{ row: 0, message: 'JSON muss ein Array von Fragen oder { meta, questions } sein' }] };
  }

  const questions: Question[] = [];
  const errors: ImportRowError[] = [];
  const seen = new Set<string>();
  data.forEach((item, index) => {
    // Erst als Zielformat versuchen, sonst als flachen Datensatz abbilden.
    const direct = QuestionSchema.safeParse({ source: options.source, version: options.version, ...item });
    if (direct.success) {
      if (seen.has(direct.data.id)) {
        errors.push({ row: index + 1, id: direct.data.id, message: 'Doppelte ID im Import' });
        return;
      }
      seen.add(direct.data.id);
      questions.push(direct.data);
      return;
    }
    const flat = importFlatRecords([item as Record<string, unknown>], options);
    for (const e of flat.errors) errors.push({ ...e, row: index + 1 });
    for (const q of flat.questions) {
      if (seen.has(q.id)) {
        errors.push({ row: index + 1, id: q.id, message: 'Doppelte ID im Import' });
        continue;
      }
      seen.add(q.id);
      questions.push(q);
    }
  });
  return { questions, errors };
}
