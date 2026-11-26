import type { CategoryId } from './categories';
import { getStatus, isDueForReview, weaknessScore, type ProgressMap } from './progress';
import { subtopicKey } from './subtopics';
import type { Material, Question } from './types';

export type Rng = () => number;

/** Deterministischer Zufallsgenerator (mulberry32) für reproduzierbare Tests. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export type StatusFilter = 'all' | 'new' | 'unmastered' | 'wrong' | 'mastered' | 'bookmarked';

export interface QuestionFilter {
  categories?: CategoryId[];
  /** Unterthemen-Schlüssel („kategorie/Unterthema“), siehe subtopics.ts */
  subtopics?: string[];
  material?: Material | 'all';
  status?: StatusFilter;
  search?: string;
}

export function filterQuestions(
  questions: readonly Question[],
  filter: QuestionFilter,
  progress: ProgressMap,
  bookmarks: Record<string, number>,
): Question[] {
  const search = filter.search?.trim().toLowerCase();
  return questions.filter((q) => {
    if (filter.categories?.length && !filter.categories.includes(q.category)) return false;
    if (filter.subtopics?.length && !filter.subtopics.includes(subtopicKey(q))) return false;
    if (filter.material && filter.material !== 'all' && q.material !== filter.material) return false;
    const status = getStatus(progress[q.id]);
    switch (filter.status) {
      case 'new':
        if (status !== 'new') return false;
        break;
      case 'unmastered':
        if (status === 'mastered') return false;
        break;
      case 'wrong':
        if (status !== 'wrong') return false;
        break;
      case 'mastered':
        if (status !== 'mastered') return false;
        break;
      case 'bookmarked':
        if (!bookmarks[q.id]) return false;
        break;
    }
    if (search) {
      const hay = `${q.text} ${q.officialNumber ?? ''} ${q.id} ${q.subcategory ?? ''} ${q.answers?.map((a) => a.text).join(' ') ?? ''}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

export type Ordering = 'random' | 'unmastered-first' | 'catalog';

export function orderQuestions(questions: readonly Question[], ordering: Ordering, progress: ProgressMap, rng: Rng = Math.random): Question[] {
  if (ordering === 'catalog') return [...questions];
  const shuffled = shuffle(questions, rng);
  if (ordering === 'random') return shuffled;
  const rank = { wrong: 0, new: 1, learning: 2, mastered: 3 } as const;
  return shuffled.sort((a, b) => rank[getStatus(progress[a.id])] - rank[getStatus(progress[b.id])]);
}

/** Fragen mit Schwächen, dringendste zuerst. */
export function selectWeakQuestions(questions: readonly Question[], progress: ProgressMap, limit?: number): Question[] {
  const scored = questions
    .map((q) => ({ q, score: weaknessScore(progress[q.id]) }))
    .filter((x): x is { q: Question; score: number } => x.score !== null)
    .sort((a, b) => b.score - a.score || (progress[a.q.id]?.lastAnsweredAt ?? 0) - (progress[b.q.id]?.lastAnsweredAt ?? 0));
  const result = scored.map((x) => x.q);
  return limit === undefined ? result : result.slice(0, limit);
}

export function selectDueQuestions(questions: readonly Question[], progress: ProgressMap, now: number): Question[] {
  return questions
    .filter((q) => isDueForReview(progress[q.id], now))
    .sort((a, b) => (progress[a.id]?.lastAnsweredAt ?? 0) - (progress[b.id]?.lastAnsweredAt ?? 0));
}

/**
 * Schnelle Runde: ausgewogene Mischung aus
 *  ~40 % Schwächen, ~20 % fälligen Wiederholungen, ~30 % neuen Fragen,
 * Rest (und alles, was fehlt) aus noch nicht gemeisterten bzw. beliebigen Fragen.
 */
export function selectQuickRound(
  questions: readonly Question[],
  progress: ProgressMap,
  size: number,
  now: number,
  rng: Rng = Math.random,
): Question[] {
  const picked = new Map<string, Question>();
  const take = (pool: Question[], n: number) => {
    for (const q of pool) {
      if (n <= 0 || picked.size >= size) break;
      if (!picked.has(q.id)) {
        picked.set(q.id, q);
        n--;
      }
    }
  };

  take(shuffle(selectWeakQuestions(questions, progress, size * 2), rng), Math.ceil(size * 0.4));
  take(selectDueQuestions(questions, progress, now), Math.ceil(size * 0.2));
  take(shuffle(questions.filter((q) => !progress[q.id]), rng), Math.ceil(size * 0.3));
  take(shuffle(questions.filter((q) => !progress[q.id]?.mastered), rng), size);
  take(shuffle(questions, rng), size);

  return shuffle([...picked.values()], rng);
}
