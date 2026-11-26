import { CatalogFileObjectSchema, CatalogFileSchema, QuestionSchema, inheritMetaDefaults } from './schema';
import type { CatalogMeta, Question } from './types';

/**
 * Reine (DOM- und Node-unabhängige) Funktionen zum Zusammenführen und Prüfen
 * mehrerer Katalogdateien. Wird von der App (Vite-Glob-Import) und von den
 * Skripten (Dateisystem) gleichermaßen genutzt.
 */

export interface RawCatalogFile {
  /** Dateiname oder Pfad, nur für Fehlermeldungen. */
  name: string;
  data: unknown;
}

export interface CatalogIssue {
  file: string;
  severity: 'error' | 'warning';
  /** Pfad innerhalb der Datei, z. B. "questions[3].answers". */
  path: string;
  questionId?: string;
  message: string;
}

export interface LoadedCatalog {
  questions: Question[];
  byId: Map<string, Question>;
  files: { name: string; meta: CatalogMeta; count: number }[];
  issues: CatalogIssue[];
}

function formatPath(path: (string | number)[]): string {
  return path.reduce<string>((acc, part) => {
    if (typeof part === 'number') return `${acc}[${part}]`;
    return acc ? `${acc}.${part}` : part;
  }, '');
}

/**
 * Prüft und vereint Katalogdateien.
 * - Ungültige Dateien werden komplett übersprungen (Fehler im Report).
 * - Ungültige einzelne Fragen werden übersprungen, gültige derselben Datei bleiben erhalten.
 * - Doppelte IDs: Die zuerst geladene Frage gewinnt. Doppelte amtliche Nummern ergeben eine Warnung.
 */
export function loadCatalog(rawFiles: RawCatalogFile[]): LoadedCatalog {
  const issues: CatalogIssue[] = [];
  const questions: Question[] = [];
  const byId = new Map<string, Question>();
  const officialNumbers = new Map<string, string>();
  const files: LoadedCatalog['files'] = [];

  const sorted = [...rawFiles].sort((a, b) => a.name.localeCompare(b.name));

  for (const file of sorted) {
    const parsed = CatalogFileSchema.safeParse(file.data);
    let meta: CatalogMeta;
    let candidates: unknown[];

    if (parsed.success) {
      meta = parsed.data.meta;
      candidates = parsed.data.questions;
    } else {
      // Datei-Struktur ungültig → versuchen, wenigstens einzelne Fragen zu retten.
      const data = inheritMetaDefaults(file.data) as { meta?: unknown; questions?: unknown } | null;
      const metaResult = CatalogFileObjectSchema.shape.meta.safeParse(data?.meta);
      if (!metaResult.success || !Array.isArray(data?.questions)) {
        for (const issue of parsed.error.issues) {
          issues.push({ file: file.name, severity: 'error', path: formatPath(issue.path), message: issue.message });
        }
        continue;
      }
      meta = metaResult.data;
      candidates = data.questions;
    }

    let count = 0;
    candidates.forEach((candidate, index) => {
      const q = parsed.success
        ? { success: true as const, data: candidate as Question }
        : QuestionSchema.safeParse(candidate);

      if (!q.success) {
        const qid = (candidate as { id?: unknown })?.id;
        for (const issue of q.error.issues) {
          issues.push({
            file: file.name,
            severity: 'error',
            path: formatPath(['questions', index, ...issue.path]),
            questionId: typeof qid === 'string' ? qid : undefined,
            message: issue.message,
          });
        }
        return;
      }

      const question = q.data;
      if (byId.has(question.id)) {
        issues.push({
          file: file.name,
          severity: 'error',
          path: formatPath(['questions', index, 'id']),
          questionId: question.id,
          message: `Doppelte ID "${question.id}", Frage wird übersprungen`,
        });
        return;
      }

      if (question.officialNumber) {
        const existing = officialNumbers.get(question.officialNumber);
        if (existing) {
          issues.push({
            file: file.name,
            severity: 'warning',
            path: formatPath(['questions', index, 'officialNumber']),
            questionId: question.id,
            message: `Amtliche Nummer ${question.officialNumber} bereits vergeben an "${existing}"`,
          });
        } else {
          officialNumbers.set(question.officialNumber, question.id);
        }
      }

      if (question.media && !question.media.src && question.source === 'official') {
        issues.push({
          file: file.name,
          severity: 'warning',
          path: formatPath(['questions', index, 'media', 'src']),
          questionId: question.id,
          message: 'Amtliche Frage ohne Bilddatei, Platzhalter wird angezeigt',
        });
      }

      byId.set(question.id, question);
      questions.push(question);
      count++;
    });

    files.push({ name: file.name, meta, count });
  }

  return { questions, byId, files, issues };
}

export interface CatalogStats {
  total: number;
  byCategory: Record<string, number>;
  byMaterial: Record<string, number>;
  byType: Record<string, number>;
  byPoints: Record<string, number>;
  withMedia: number;
}

export function computeCatalogStats(questions: Question[]): CatalogStats {
  const stats: CatalogStats = { total: questions.length, byCategory: {}, byMaterial: {}, byType: {}, byPoints: {}, withMedia: 0 };
  const inc = (rec: Record<string, number>, key: string) => {
    rec[key] = (rec[key] ?? 0) + 1;
  };
  for (const q of questions) {
    inc(stats.byCategory, q.category);
    inc(stats.byMaterial, q.material);
    inc(stats.byType, q.type);
    inc(stats.byPoints, String(q.points));
    if (q.media) stats.withMedia++;
  }
  return stats;
}
