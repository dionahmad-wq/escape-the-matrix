import { describe, expect, it } from 'vitest';
import { applyAnswer, type ProgressMap } from '../src/domain/progress';
import { createRng, filterQuestions, orderQuestions, selectQuickRound, selectWeakQuestions, shuffle } from '../src/domain/selection';
import { QuestionSchema } from '../src/domain/schema';
import type { Question } from '../src/domain/types';
import { choiceQuestion } from './fixtures';

const t0 = 1_700_000_000_000;
const qs: Question[] = Array.from({ length: 30 }, (_, i) =>
  QuestionSchema.parse(
    choiceQuestion({
      id: `q${i}`,
      category: i % 2 ? 'vorfahrt' : 'technik',
      material: i < 20 ? 'grundstoff' : 'zusatzstoff',
      text: `Frage Nummer ${i}`,
    }),
  ),
);

describe('shuffle / rng', () => {
  it('ist mit gleichem Seed reproduzierbar und vollständig', () => {
    const a = shuffle(qs, createRng(1)).map((q) => q.id);
    const b = shuffle(qs, createRng(1)).map((q) => q.id);
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual(qs.map((q) => q.id).sort());
  });
});

describe('filterQuestions', () => {
  const progress: ProgressMap = { q1: applyAnswer(undefined, false, false, t0) };
  it('filtert nach Kategorie, Stoff, Status, Lesezeichen und Suche', () => {
    expect(filterQuestions(qs, { categories: ['technik'] }, {}, {})).toHaveLength(15);
    expect(filterQuestions(qs, { material: 'zusatzstoff' }, {}, {})).toHaveLength(10);
    expect(filterQuestions(qs, { status: 'wrong' }, progress, {}).map((q) => q.id)).toEqual(['q1']);
    expect(filterQuestions(qs, { status: 'new' }, progress, {})).toHaveLength(29);
    expect(filterQuestions(qs, { status: 'bookmarked' }, {}, { q5: 1 }).map((q) => q.id)).toEqual(['q5']);
    expect(filterQuestions(qs, { search: 'nummer 12' }, {}, {}).map((q) => q.id)).toEqual(['q12']);
  });
});

describe('orderQuestions', () => {
  it('stellt falsche und neue vor gemeisterte', () => {
    let m = applyAnswer(undefined, true, false, t0);
    m = applyAnswer(m, true, false, t0);
    const progress: ProgressMap = { q0: m, q1: applyAnswer(undefined, false, false, t0) };
    const ordered = orderQuestions(qs.slice(0, 3), 'unmastered-first', progress, createRng(3)).map((q) => q.id);
    expect(ordered[0]).toBe('q1');
    expect(ordered[2]).toBe('q0');
  });
});

describe('selectWeakQuestions', () => {
  it('liefert nur schwache Fragen, dringendste zuerst', () => {
    const twice = applyAnswer(applyAnswer(undefined, false, false, t0), false, false, t0);
    const progress: ProgressMap = {
      q0: applyAnswer(undefined, true, false, t0),
      q1: applyAnswer(undefined, true, true, t0),
      q2: twice,
    };
    expect(selectWeakQuestions(qs, progress).map((q) => q.id)).toEqual(['q2', 'q1']);
  });
});

describe('selectQuickRound', () => {
  it('liefert genau n eindeutige Fragen und bevorzugt Schwächen', () => {
    const progress: ProgressMap = { q3: applyAnswer(undefined, false, false, t0), q4: applyAnswer(undefined, false, false, t0) };
    const round = selectQuickRound(qs, progress, 10, t0, createRng(7));
    expect(round).toHaveLength(10);
    expect(new Set(round.map((q) => q.id)).size).toBe(10);
    expect(round.map((q) => q.id)).toEqual(expect.arrayContaining(['q3', 'q4']));
  });

  it('kommt mit kleinen Katalogen zurecht', () => {
    expect(selectQuickRound(qs.slice(0, 4), {}, 10, t0)).toHaveLength(4);
  });
});
