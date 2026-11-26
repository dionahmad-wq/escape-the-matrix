import { z } from 'zod';
import { CATEGORY_IDS } from './categories';

/** Deutsche Fehlermeldungen für die häufigsten Zod-Fehler (Import- und Prüfberichte). */
const germanErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case 'invalid_type':
      if (issue.received === 'undefined') return { message: 'Pflichtfeld fehlt' };
      return { message: `Erwartet ${issue.expected}, erhalten ${issue.received}` };
    case 'invalid_enum_value':
      return { message: `Ungültiger Wert "${String(issue.received)}", erlaubt: ${issue.options.join(', ')}` };
    case 'invalid_union':
      return { message: 'Ungültiger Wert' };
    case 'too_small':
      if (issue.type === 'array') return { message: `Mindestens ${issue.minimum} Einträge erforderlich` };
      if (issue.type === 'string') return { message: `Mindestens ${issue.minimum} Zeichen erforderlich` };
      return { message: `Wert muss ≥ ${issue.minimum} sein` };
    case 'too_big':
      if (issue.type === 'array') return { message: `Höchstens ${issue.maximum} Einträge erlaubt` };
      return { message: `Wert zu groß (max. ${issue.maximum})` };
    default:
      return { message: ctx.defaultError };
  }
};
z.setErrorMap(germanErrorMap);

/**
 * Zentrales, validiertes Datenmodell des Fragenkatalogs.
 * Die TypeScript-Typen in `types.ts` werden hieraus abgeleitet. Es gibt also
 * genau eine Quelle der Wahrheit für App, Import- und Prüfskripte.
 */

export const MaterialSchema = z.enum(['grundstoff', 'zusatzstoff']);
export const QuestionTypeSchema = z.enum(['single', 'multiple', 'number']);
export const QuestionSourceSchema = z.enum(['seed', 'official', 'custom']);
export const CategorySchema = z.enum(CATEGORY_IDS);
export const PointsSchema = z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)], {
  errorMap: () => ({ message: 'Punkte müssen 2, 3, 4 oder 5 sein' }),
});

export const MediaSchema = z.object({
  kind: z.enum(['image', 'video', 'sign']),
  /** Pfad relativ zu /public/media oder absolute URL. Fehlt er, wird der Platzhalter gezeigt. */
  src: z.string().min(1).optional(),
  /** Beschreibung der Situation für den Platzhalter (bis echtes Bildmaterial vorliegt). */
  placeholder: z.string().min(1),
  /** Alternativtext für Screenreader. */
  alt: z.string().min(1),
  /** Optional: amtliche Verkehrszeichen-Nummer nach StVO-Anlage, z. B. "205". */
  signNumber: z.string().optional(),
});

export const AnswerOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  correct: z.boolean(),
  /** Warum genau diese Antwort richtig bzw. falsch ist. */
  explanation: z.string().min(1).optional(),
});

export const NumberAnswerSchema = z.object({
  value: z.number(),
  /** Einheit, die hinter dem Eingabefeld angezeigt wird, z. B. "m" oder "km/h". */
  unit: z.string().optional(),
  /** Erlaubte Abweichung (Standard: 0, also exakt). */
  tolerance: z.number().nonnegative().optional(),
  /** Text vor dem Eingabefeld, z. B. "Anhalteweg:". */
  prefix: z.string().optional(),
});

const ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/i;
/** Format der amtlichen Fragenummer, z. B. "1.1.02-001" oder "2.2.03-104-M". */
export const OFFICIAL_NUMBER_PATTERN = /^\d\.\d{1,2}\.\d{2}-\d{3}(-[A-Z])?$/;

export const QuestionBaseSchema = z.object({
  id: z.string().regex(ID_PATTERN, 'ID darf nur Buchstaben, Ziffern, ".", "_" und "-" enthalten'),
  officialNumber: z
    .string()
    .regex(OFFICIAL_NUMBER_PATTERN, 'Format z. B. "1.1.02-001"')
    .optional(),
  category: CategorySchema,
  subcategory: z.string().min(1).optional(),
  material: MaterialSchema,
  licenseClasses: z.array(z.string().min(1)).min(1).default(['B']),
  type: QuestionTypeSchema,
  points: PointsSchema,
  text: z.string().min(5),
  media: MediaSchema.optional(),
  answers: z.array(AnswerOptionSchema).min(2).max(5).optional(),
  numberAnswer: NumberAnswerSchema.optional(),
  /** Musterlösung, wird nach dem Beantworten immer angezeigt. */
  explanation: z.string().min(1),
  /** Eselsbrücke bzw. Merksatz. */
  mnemonic: z.string().min(1).optional(),
  tags: z.array(z.string().min(1)).optional(),
  source: QuestionSourceSchema,
  /** Katalogstand, z. B. "2026-10". */
  version: z.string().optional(),
});

export const QuestionSchema = QuestionBaseSchema.superRefine((q, ctx) => {
  if (q.type === 'number') {
    if (!q.numberAnswer) {
      ctx.addIssue({ code: 'custom', path: ['numberAnswer'], message: 'Zahlenfrage braucht "numberAnswer"' });
    }
    if (q.answers) {
      ctx.addIssue({ code: 'custom', path: ['answers'], message: 'Zahlenfrage darf keine "answers" haben' });
    }
    return;
  }

  if (q.numberAnswer) {
    ctx.addIssue({ code: 'custom', path: ['numberAnswer'], message: 'Auswahlfrage darf kein "numberAnswer" haben' });
  }
  if (!q.answers) {
    ctx.addIssue({ code: 'custom', path: ['answers'], message: 'Auswahlfrage braucht mindestens 2 "answers"' });
    return;
  }

  const ids = q.answers.map((a) => a.id);
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: 'custom', path: ['answers'], message: 'Antwort-IDs müssen innerhalb einer Frage eindeutig sein' });
  }

  const correctCount = q.answers.filter((a) => a.correct).length;
  if (q.type === 'single' && correctCount !== 1) {
    ctx.addIssue({
      code: 'custom',
      path: ['answers'],
      message: `Typ "single" braucht genau 1 richtige Antwort (gefunden: ${correctCount})`,
    });
  }
  if (q.type === 'multiple' && correctCount < 1) {
    ctx.addIssue({ code: 'custom', path: ['answers'], message: 'Typ "multiple" braucht mindestens 1 richtige Antwort' });
  }
});

export const CatalogMetaSchema = z.object({
  /** Eindeutige Katalog-ID, z. B. "seed-vorfahrt". */
  id: z.string().regex(ID_PATTERN),
  title: z.string().min(1),
  version: z.string().min(1),
  source: QuestionSourceSchema,
  license: z.string().optional(),
  description: z.string().optional(),
});

/**
 * Fragen erben `source` und `version` aus `meta`, sofern sie sie nicht selbst setzen.
 * So müssen diese Felder in Katalogdateien nicht bei jeder Frage wiederholt werden.
 */
export function inheritMetaDefaults(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const { meta, questions } = data as { meta?: { source?: unknown; version?: unknown }; questions?: unknown };
  if (!meta || !Array.isArray(questions)) return data;
  return {
    ...data,
    questions: questions.map((q) =>
      q && typeof q === 'object' ? { source: meta.source, version: meta.version, ...q } : q,
    ),
  };
}

const CatalogFileObjectSchema = z.object({
  $schema: z.string().optional(),
  meta: CatalogMetaSchema,
  questions: z.array(QuestionSchema),
});

export const CatalogFileSchema = z.preprocess(inheritMetaDefaults, CatalogFileObjectSchema);
/** Ohne Vorverarbeitung, z. B. für den JSON-Schema-Export und Teilprüfungen. */
export { CatalogFileObjectSchema };
