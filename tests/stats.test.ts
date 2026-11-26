import { describe, expect, it } from 'vitest';
import type { ExamRecord } from '../src/domain/exam';
import { applyAnswer, type ProgressMap } from '../src/domain/progress';
import { QuestionSchema } from '../src/domain/schema';
import { buildRecommendations, computeCategoryStats, computeOverall, computeReadiness, computeStreak, dayKey } from '../src/domain/stats';
import { choiceQuestion } from './fixtures';

const t0 = new Date(2026, 10, 26, 12).getTime();
const qs = Array.from({ length: 10 }, (_, i) =>
  QuestionSchema.parse(choiceQuestion({ id: `q${i}`, category: i < 5 ? 'vorfahrt' : 'technik' })),
);
const mastered = applyAnswer(applyAnswer(undefined, true, false, t0), true, false, t0);
const wrong = applyAnswer(undefined, false, false, t0);

describe('computeOverall / computeCategoryStats', () => {
  const progress: ProgressMap = { q0: mastered, q1: wrong, q5: applyAnswer(undefined, true, false, t0) };
  it('zählt Status und Trefferquote', () => {
    const o = computeOverall(qs, progress, t0);
    expect(o).toMatchObject({ total: 10, seen: 3, mastered: 1, wrongNow: 1, learning: 1, answers: 4, correctAnswers: 3, weak: 1 });
    expect(o.accuracy).toBeCloseTo(0.75);
  });
  it('rechnet pro Kategorie', () => {
    const v = computeCategoryStats(qs, progress).find((c) => c.id === 'vorfahrt')!;
    expect(v).toMatchObject({ total: 5, seen: 2, mastered: 1, wrongNow: 1 });
    expect(v.masteryShare).toBeCloseTo(0.2);
  });
});

describe('computeStreak', () => {
  const today = new Date(2026, 10, 26);
  const d = (offset: number) => dayKey(new Date(2026, 10, 26 - offset));
  it('zählt aufeinanderfolgende Tage mit erreichtem Ziel', () => {
    const a = { [d(0)]: { answered: 20, correct: 10 }, [d(1)]: { answered: 25, correct: 1 }, [d(2)]: { answered: 5, correct: 5 } };
    expect(computeStreak(a, 20, today)).toBe(2);
  });
  it('heute noch offen → Serie ab gestern', () => {
    const a = { [d(0)]: { answered: 3, correct: 3 }, [d(1)]: { answered: 20, correct: 1 }, [d(2)]: { answered: 20, correct: 1 } };
    expect(computeStreak(a, 20, today)).toBe(2);
  });
  it('0 ohne Aktivität', () => expect(computeStreak({}, 20, today)).toBe(0));
});

describe('Prüfungsreife & Empfehlungen', () => {
  const exam = (passed: boolean, i: number): ExamRecord => ({
    id: `e${i}`, configId: 'B', startedAt: t0 - i, finishedAt: t0 - i, durationSec: 600, timedOut: false,
    questionIds: [], answers: {}, totalPoints: 110, errorPoints: passed ? 4 : 14, fivePointErrors: 0, correctCount: 0, passed,
  });

  it('ist prüfungsreif bei 3 bestandenen Simulationen und ≥ 80 % gemeistert', () => {
    const progress: ProgressMap = Object.fromEntries(qs.slice(0, 8).map((q) => [q.id, mastered]));
    const r = computeReadiness(computeOverall(qs, progress, t0), [exam(true, 1), exam(true, 2), exam(true, 3)]);
    expect(r.ready).toBe(true);
    expect(r.label).toBe('Prüfungsreif');
  });

  it('empfiehlt zuerst eine schnelle Runde, wenn noch nichts gelernt wurde', () => {
    const recs = buildRecommendations(qs, {}, [], t0);
    expect(recs[0]?.action).toEqual({ kind: 'quick' });
  });

  it('empfiehlt Schwächen-Training und das schwächste Thema', () => {
    const progress: ProgressMap = {};
    for (const q of qs.slice(0, 5)) progress[q.id] = wrong;
    progress.q5 = mastered;
    const recs = buildRecommendations(qs, progress, [], t0);
    expect(recs.map((r) => r.action.kind)).toEqual(expect.arrayContaining(['weakness', 'topic']));
    expect(recs.find((r) => r.id.startsWith('topic-'))?.action).toEqual({ kind: 'topic', category: 'vorfahrt' });
  });
});
