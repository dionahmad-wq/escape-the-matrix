/**
 * Lernfortschritt pro Frage und Mastery-Logik.
 *
 * Eine Frage gilt als gemeistert, wenn sie MASTERY_STREAK-mal hintereinander
 * richtig (und nicht als „unsicher“ markiert) beantwortet wurde. Ein Fehler
 * setzt die Serie zurück und hebt den Mastery-Status auf.
 */

export const MASTERY_STREAK = 2;
export const DAY_MS = 24 * 60 * 60 * 1000;

export interface QuestionProgress {
  seen: number;
  correct: number;
  wrong: number;
  /** Richtige Antworten in Folge (unsichere zählen nicht). */
  streak: number;
  lastResult: 'correct' | 'wrong';
  lastAnsweredAt: number;
  /** Beim letzten Beantworten als „unsicher“ markiert. */
  unsure: boolean;
  mastered: boolean;
  masteredAt?: number;
}

export type ProgressMap = Record<string, QuestionProgress>;
export type QuestionStatus = 'new' | 'wrong' | 'learning' | 'mastered';

export const STATUS_LABEL: Record<QuestionStatus, string> = {
  new: 'Neu',
  wrong: 'Falsch',
  learning: 'In Arbeit',
  mastered: 'Gemeistert',
};

export function applyAnswer(
  prev: QuestionProgress | undefined,
  correct: boolean,
  unsure: boolean,
  now: number,
): QuestionProgress {
  const prevStreak = prev?.streak ?? 0;
  const streak = !correct ? 0 : unsure ? prevStreak : prevStreak + 1;
  const mastered = streak >= MASTERY_STREAK;
  return {
    seen: (prev?.seen ?? 0) + 1,
    correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
    wrong: (prev?.wrong ?? 0) + (correct ? 0 : 1),
    streak,
    lastResult: correct ? 'correct' : 'wrong',
    lastAnsweredAt: now,
    unsure,
    mastered,
    masteredAt: mastered ? (prev?.mastered && prev.masteredAt ? prev.masteredAt : now) : undefined,
  };
}

export function getStatus(p: QuestionProgress | undefined): QuestionStatus {
  if (!p) return 'new';
  if (p.mastered) return 'mastered';
  if (p.lastResult === 'wrong') return 'wrong';
  return 'learning';
}

export function remainingForMastery(p: QuestionProgress | undefined): number {
  return Math.max(0, MASTERY_STREAK - (p?.streak ?? 0));
}

/** Wiederholungsintervall (vereinfachte Spaced Repetition) abhängig von der Serie. */
export function reviewIntervalDays(streak: number): number {
  if (streak <= MASTERY_STREAK) return 3;
  if (streak === MASTERY_STREAK + 1) return 7;
  if (streak === MASTERY_STREAK + 2) return 14;
  return 30;
}

/** Gemeisterte Fragen werden nach einer Weile zur Auffrischung wieder fällig. */
export function isDueForReview(p: QuestionProgress | undefined, now: number): boolean {
  if (!p?.mastered) return false;
  return now - p.lastAnsweredAt >= reviewIntervalDays(p.streak) * DAY_MS;
}

/**
 * Wie dringend eine Frage geübt werden sollte (höher = dringender).
 * null = keine Schwäche.
 */
export function weaknessScore(p: QuestionProgress | undefined): number | null {
  if (!p) return null;
  const isWeak = p.lastResult === 'wrong' || p.unsure || (!p.mastered && p.wrong > 0);
  if (!isWeak) return null;
  return (p.lastResult === 'wrong' ? 3 : 0) + (p.unsure ? 1.5 : 0) + (p.wrong / p.seen) * 2 + Math.min(p.wrong, 5) * 0.2;
}
