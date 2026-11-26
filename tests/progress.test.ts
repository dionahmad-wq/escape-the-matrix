import { describe, expect, it } from 'vitest';
import { applyAnswer, DAY_MS, getStatus, isDueForReview, remainingForMastery, weaknessScore } from '../src/domain/progress';

const t0 = 1_700_000_000_000;

describe('Mastery', () => {
  it('ist nach 2× richtig in Folge gemeistert', () => {
    const p1 = applyAnswer(undefined, true, false, t0);
    expect(p1).toMatchObject({ seen: 1, streak: 1, mastered: false });
    expect(remainingForMastery(p1)).toBe(1);
    const p2 = applyAnswer(p1, true, false, t0 + 1);
    expect(p2).toMatchObject({ streak: 2, mastered: true, masteredAt: t0 + 1 });
    expect(getStatus(p2)).toBe('mastered');
  });

  it('ein Fehler setzt Serie und Mastery zurück', () => {
    let p = applyAnswer(undefined, true, false, t0);
    p = applyAnswer(p, true, false, t0);
    p = applyAnswer(p, false, false, t0);
    expect(p).toMatchObject({ streak: 0, mastered: false, wrong: 1, correct: 2 });
    expect(getStatus(p)).toBe('wrong');
  });

  it('unsichere richtige Antworten zählen nicht für die Serie', () => {
    let p = applyAnswer(undefined, true, false, t0);
    p = applyAnswer(p, true, true, t0);
    expect(p).toMatchObject({ streak: 1, mastered: false, unsure: true, correct: 2 });
    expect(weaknessScore(p)).not.toBeNull();
  });

  it('behält das ursprüngliche masteredAt bei weiteren richtigen Antworten', () => {
    let p = applyAnswer(undefined, true, false, t0);
    p = applyAnswer(p, true, false, t0 + 10);
    p = applyAnswer(p, true, false, t0 + 20);
    expect(p.masteredAt).toBe(t0 + 10);
  });
});

describe('Wiederholung & Schwächen', () => {
  it('gemeisterte Fragen werden nach dem Intervall fällig', () => {
    let p = applyAnswer(undefined, true, false, t0);
    p = applyAnswer(p, true, false, t0);
    expect(isDueForReview(p, t0 + 2 * DAY_MS)).toBe(false);
    expect(isDueForReview(p, t0 + 3 * DAY_MS)).toBe(true);
  });

  it('nur Fragen mit Problemen haben einen Schwächewert', () => {
    expect(weaknessScore(undefined)).toBeNull();
    expect(weaknessScore(applyAnswer(undefined, true, false, t0))).toBeNull();
    const wrong = weaknessScore(applyAnswer(undefined, false, false, t0))!;
    const unsure = weaknessScore(applyAnswer(undefined, true, true, t0))!;
    expect(wrong).toBeGreaterThan(unsure);
  });
});
