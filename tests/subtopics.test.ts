import { describe, expect, it } from 'vitest';
import { loadCatalog } from '../src/domain/catalog';
import { mapFlatRecord } from '../src/domain/importMapping';
import { applyAnswer } from '../src/domain/progress';
import { QuestionSchema } from '../src/domain/schema';
import { filterQuestions } from '../src/domain/selection';
import { listSubtopics, parseSubtopicKey, subtopicKey } from '../src/domain/subtopics';
import { readCatalogFiles } from '../scripts/lib/catalogFiles';
import { choiceQuestion } from './fixtures';

const q = (id: string, category: 'vorfahrt' | 'technik', subcategory?: string) =>
  QuestionSchema.parse(choiceQuestion({ id, category, subcategory }));
const qs = [q('a', 'vorfahrt', 'Kreisverkehr'), q('b', 'vorfahrt', 'Kreisverkehr'), q('c', 'vorfahrt', 'Ampeln'), q('d', 'technik', 'Ampeln'), q('e', 'technik')];

describe('Unterthemen', () => {
  it('Schlüssel enthält die Kategorie (gleiche Namen in verschiedenen Themen bleiben getrennt)', () => {
    expect(subtopicKey(qs[2]!)).toBe('vorfahrt/Ampeln');
    expect(subtopicKey(qs[3]!)).toBe('technik/Ampeln');
    expect(subtopicKey(qs[4]!)).toBe('technik/Allgemein');
    expect(parseSubtopicKey('vorfahrt/Ampeln & Polizei')).toEqual({ category: 'vorfahrt', label: 'Ampeln & Polizei' });
  });

  it('listet Unterthemen mit Zählern und Fortschritt, nach Kategorie-Reihenfolge', () => {
    let m = applyAnswer(undefined, true, false, 1);
    m = applyAnswer(m, true, false, 1);
    const list = listSubtopics(qs, { a: m });
    expect(list.map((s) => s.key)).toEqual(['vorfahrt/Kreisverkehr', 'vorfahrt/Ampeln', 'technik/Allgemein', 'technik/Ampeln']);
    expect(list[0]).toMatchObject({ total: 2, seen: 1, mastered: 1, masteryShare: 0.5 });
    expect(listSubtopics(qs, {}, ['technik'])).toHaveLength(2);
  });

  it('filtert nach Unterthema', () => {
    expect(filterQuestions(qs, { subtopics: ['vorfahrt/Kreisverkehr'] }, {}, {}).map((x) => x.id)).toEqual(['a', 'b']);
    expect(filterQuestions(qs, { subtopics: ['technik/Ampeln', 'vorfahrt/Ampeln'] }, {}, {}).map((x) => x.id)).toEqual(['c', 'd']);
  });

  it('Seed-Katalog: jede Frage hat ein Unterthema, jedes Thema 2–5 Unterthemen', () => {
    const seed = loadCatalog(readCatalogFiles(['data/seed'])).questions;
    expect(seed.every((x) => x.subcategory)).toBe(true);
    const list = listSubtopics(seed);
    const perCat = new Map<string, number>();
    for (const s of list) perCat.set(s.category, (perCat.get(s.category) ?? 0) + 1);
    for (const n of perCat.values()) {
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(5);
    }
  });

  it('Import leitet das Unterthema aus der amtlichen Nummer ab', () => {
    expect(mapFlatRecord({ officialNumber: '1.3.02-007', text: 'Frage?' }, { source: 'official' }).subcategory).toBe('Abschnitt 1.3.02');
    expect(mapFlatRecord({ officialNumber: '1.3.02-007', Unterthema: 'Kreisverkehr', text: 'Frage?' }, { source: 'official' }).subcategory).toBe('Kreisverkehr');
  });
});
