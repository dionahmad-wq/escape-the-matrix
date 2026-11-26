import { CATEGORY_IDS, type CategoryId } from './categories';
import type { ProgressMap } from './progress';
import type { Question } from './types';

/**
 * Unterthemen innerhalb der 8 Themenbereiche.
 * Der Schlüssel enthält die Kategorie („vorfahrt/Ampeln & Polizei“), weil gleiche
 * Namen in mehreren Kategorien vorkommen können (z. B. „Anhänger …“).
 */
export const FALLBACK_SUBTOPIC = 'Allgemein';

export function subtopicLabel(q: Question): string {
  return q.subcategory ?? FALLBACK_SUBTOPIC;
}

export function subtopicKey(q: Question): string {
  return `${q.category}/${subtopicLabel(q)}`;
}

export function parseSubtopicKey(key: string): { category: CategoryId; label: string } {
  const i = key.indexOf('/');
  return { category: key.slice(0, i) as CategoryId, label: key.slice(i + 1) };
}

export interface SubtopicInfo {
  key: string;
  category: CategoryId;
  label: string;
  total: number;
  seen: number;
  mastered: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number | null;
  masteryShare: number;
}

/** Alle Unterthemen (optional nur bestimmter Kategorien), sortiert nach Kategorie-Reihenfolge und Größe. */
export function listSubtopics(questions: readonly Question[], progress: ProgressMap = {}, categories?: readonly CategoryId[]): SubtopicInfo[] {
  const map = new Map<string, SubtopicInfo>();
  for (const q of questions) {
    if (categories?.length && !categories.includes(q.category)) continue;
    const key = subtopicKey(q);
    let s = map.get(key);
    if (!s) {
      s = { key, category: q.category, label: subtopicLabel(q), total: 0, seen: 0, mastered: 0, correctAnswers: 0, wrongAnswers: 0, accuracy: null, masteryShare: 0 };
      map.set(key, s);
    }
    s.total++;
    const p = progress[q.id];
    if (p) {
      s.seen++;
      if (p.mastered) s.mastered++;
      s.correctAnswers += p.correct;
      s.wrongAnswers += p.wrong;
    }
  }
  const order = (c: CategoryId) => CATEGORY_IDS.indexOf(c);
  return [...map.values()]
    .map((s) => {
      const answers = s.correctAnswers + s.wrongAnswers;
      return { ...s, accuracy: answers ? s.correctAnswers / answers : null, masteryShare: s.total ? s.mastered / s.total : 0 };
    })
    .sort((a, b) => order(a.category) - order(b.category) || b.total - a.total || a.label.localeCompare(b.label, 'de'));
}
