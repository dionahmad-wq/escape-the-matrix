import { z } from 'zod';
import { STORAGE_VERSION, type PersistedData } from './useAppStore';

/**
 * Export/Import des Lernstands als JSON-Datei (z. B. zum Gerätewechsel).
 * Die Struktur wird beim Import geprüft, damit kaputte Dateien den Lernstand nicht zerstören.
 */

export const BACKUP_APP_ID = 'fuehrerschein-theorie-trainer';

const UserAnswerSchema = z.union([
  z.object({ kind: z.literal('choice'), selected: z.array(z.string()) }),
  z.object({ kind: z.literal('number'), value: z.number().nullable() }),
]);

const ProgressSchema = z.object({
  seen: z.number().int().nonnegative(),
  correct: z.number().int().nonnegative(),
  wrong: z.number().int().nonnegative(),
  streak: z.number().int().nonnegative(),
  lastResult: z.enum(['correct', 'wrong']),
  lastAnsweredAt: z.number(),
  unsure: z.boolean(),
  mastered: z.boolean(),
  masteredAt: z.number().optional(),
});

const ExamRecordSchema = z.object({
  id: z.string(),
  configId: z.string(),
  startedAt: z.number(),
  finishedAt: z.number(),
  durationSec: z.number(),
  timedOut: z.boolean(),
  questionIds: z.array(z.string()),
  answers: z.record(UserAnswerSchema),
  totalPoints: z.number(),
  errorPoints: z.number(),
  fivePointErrors: z.number(),
  correctCount: z.number(),
  passed: z.boolean(),
});

export const BackupSchema = z.object({
  app: z.literal(BACKUP_APP_ID),
  version: z.number().int(),
  exportedAt: z.string(),
  data: z.object({
    progress: z.record(ProgressSchema),
    bookmarks: z.record(z.number()),
    examHistory: z.array(ExamRecordSchema),
    activity: z.record(z.object({ answered: z.number(), correct: z.number() })),
    settings: z
      .object({
        dailyGoal: z.number().int().min(1).max(500),
        quickRoundSize: z.number().int().min(5).max(50),
        examMinutes: z.number().int().min(0).max(180),
        autoShowExplanation: z.boolean(),
        autoAdvanceOnCorrect: z.boolean(),
      })
      .partial()
      .optional(),
  }),
});

export type Backup = z.infer<typeof BackupSchema>;

export function createBackup(data: PersistedData, now = new Date()): Backup {
  return {
    app: BACKUP_APP_ID,
    version: STORAGE_VERSION,
    exportedAt: now.toISOString(),
    data: {
      progress: data.progress,
      bookmarks: data.bookmarks,
      examHistory: data.examHistory,
      activity: data.activity,
      settings: data.settings,
    },
  };
}

export type ParseBackupResult = { ok: true; backup: Backup } | { ok: false; error: string };

export function parseBackup(text: string): ParseBackupResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Die Datei ist kein gültiges JSON.' };
  }
  const r = BackupSchema.safeParse(json);
  if (!r.success) {
    const first = r.error.issues[0];
    return { ok: false, error: `Keine gültige Sicherung (${first?.path.join('.') || 'Datei'}: ${first?.message}).` };
  }
  if (r.data.version > STORAGE_VERSION) {
    return { ok: false, error: 'Die Sicherung stammt aus einer neueren App-Version.' };
  }
  return { ok: true, backup: r.data };
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
