import { describe, expect, it } from 'vitest';
import type { UserAnswer } from '../src/domain/answers';
import { loadCatalog } from '../src/domain/catalog';
import { composeExam, EXAM_CONFIG_B, scoreExam } from '../src/domain/exam';
import { QuestionSchema } from '../src/domain/schema';
import { createRng } from '../src/domain/selection';
import type { Question } from '../src/domain/types';
import { readCatalogFiles } from '../scripts/lib/catalogFiles';
import { choiceQuestion } from './fixtures';

const seed = loadCatalog(readCatalogFiles(['data/seed'])).questions;

const q = (id: string, points: 2 | 3 | 4 | 5): Question =>
  QuestionSchema.parse(choiceQuestion({ id, points }));
const right: UserAnswer = { kind: 'choice', selected: ['b'] };
const wrong: UserAnswer = { kind: 'choice', selected: ['a'] };

describe('composeExam (Seed-Katalog)', () => {
  it.each([1, 2, 3, 4, 5, 42, 99])('liefert 20 Grundstoff + 10 Zusatzstoff mit 110 Punkten (Seed %i)', (s) => {
    const exam = composeExam(seed, EXAM_CONFIG_B, createRng(s));
    expect(exam).toHaveLength(30);
    expect(new Set(exam.map((x) => x.id)).size).toBe(30);
    expect(exam.slice(0, 20).every((x) => x.material === 'grundstoff')).toBe(true);
    expect(exam.slice(20).every((x) => x.material === 'zusatzstoff')).toBe(true);
    expect(exam.reduce((s2, x) => s2 + x.points, 0)).toBe(110);
  });

  it('deckt mehrere Kategorien ab', () => {
    const exam = composeExam(seed, EXAM_CONFIG_B, createRng(11));
    expect(new Set(exam.map((x) => x.category)).size).toBeGreaterThanOrEqual(6);
  });

  it('verkürzt bei zu kleinem Katalog statt abzustürzen', () => {
    const small = seed.filter((x) => x.material === 'grundstoff').slice(0, 5);
    expect(composeExam(small, EXAM_CONFIG_B, createRng(1))).toHaveLength(5);
  });
});

describe('scoreExam', () => {
  const qs = [q('a', 5), q('b', 5), q('c', 3), q('d', 2), q('e', 4)];

  it('bestanden ohne Fehler', () => {
    const s = scoreExam(qs, Object.fromEntries(qs.map((x) => [x.id, right])), EXAM_CONFIG_B);
    expect(s).toMatchObject({ passed: true, errorPoints: 0, correctCount: 5, totalPoints: 19 });
  });

  it('bestanden mit genau 10 Fehlerpunkten ohne zwei 5er-Fehler', () => {
    const qs2 = [q('a', 5), q('c', 3), q('d', 2), q('e', 4)];
    const s = scoreExam(qs2, { a: wrong, c: wrong, d: wrong, e: right }, EXAM_CONFIG_B);
    expect(s).toMatchObject({ errorPoints: 10, fivePointErrors: 1, passed: true });
  });

  it('nicht bestanden mit zwei falschen 5-Punkte-Fragen (obwohl nur 10 Fehlerpunkte)', () => {
    const s = scoreExam(qs, { a: wrong, b: wrong, c: right, d: right, e: right }, EXAM_CONFIG_B);
    expect(s.errorPoints).toBe(10);
    expect(s.passed).toBe(false);
    expect(s.failReasons.join()).toMatch(/5-Punkte/);
  });

  it('nicht bestanden mit mehr als 10 Fehlerpunkten', () => {
    const s = scoreExam(qs, { a: wrong, b: right, c: wrong, d: right, e: wrong }, EXAM_CONFIG_B);
    expect(s).toMatchObject({ errorPoints: 12, fivePointErrors: 1, passed: false });
  });

  it('unbeantwortete Fragen zählen als Fehler', () => {
    const s = scoreExam(qs, {}, EXAM_CONFIG_B);
    expect(s).toMatchObject({ errorPoints: 19, answeredCount: 0, passed: false });
  });

  it('wertet nach Kategorie und Stoff aus', () => {
    const s = scoreExam(qs, { a: wrong, b: right, c: right, d: right, e: wrong }, EXAM_CONFIG_B);
    expect(s.byCategory.vorfahrt).toEqual({ total: 5, wrong: 2, errorPoints: 9 });
    expect(s.byMaterial.grundstoff.total).toBe(5);
  });
});
