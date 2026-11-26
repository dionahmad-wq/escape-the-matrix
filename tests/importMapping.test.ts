import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Papa from 'papaparse';
import { describe, expect, it } from 'vitest';
import { importFlatRecords, importJson, mapFlatRecord } from '../src/domain/importMapping';
import { choiceQuestion } from './fixtures';

const opts = { source: 'official' as const };

describe('mapFlatRecord', () => {
  it('leitet Kategorie, Stoff und ID aus der amtlichen Nummer ab', () => {
    const q = mapFlatRecord({ officialNumber: '2.7.01-101', text: 'Frage?' }, opts);
    expect(q).toMatchObject({ id: 'off-2.7.01-101', category: 'technik', material: 'zusatzstoff' });
  });

  it('versteht deutsche Spaltenköpfe und Wahrheitswerte', () => {
    const q = mapFlatRecord(
      {
        Nummer: '1.3.01-001',
        Frage: 'Wer hat Vorfahrt?',
        Punkte: '5',
        Antwort1: 'Rechts',
        Antwort1Richtig: 'ja',
        Antwort2: 'Links',
        Antwort2Richtig: 'nein',
        'Erklärung': 'Rechts vor links',
      },
      opts,
    );
    expect(q).toMatchObject({ category: 'vorfahrt', material: 'grundstoff', points: 5, explanation: 'Rechts vor links' });
    expect(q.answers).toEqual([
      { id: 'a', text: 'Rechts', correct: true },
      { id: 'b', text: 'Links', correct: false },
    ]);
  });

  it('wählt standardmäßig "multiple" (wie in der echten Prüfung), optional "auto"', () => {
    const row = { id: 'x', category: 'vorfahrt', material: 'g', points: 2, text: 'Frage?', answer1: 'A', answer1correct: '1', answer2: 'B', explanation: 'E' };
    expect(mapFlatRecord(row, opts).type).toBe('multiple');
    expect(mapFlatRecord(row, { ...opts, defaultChoiceType: 'auto' }).type).toBe('single');
  });

  it('erkennt Zahlenfragen inkl. Dezimalkomma', () => {
    const q = mapFlatRecord({ id: 'n', category: 'technik', material: 'zusatzstoff', points: 3, text: 'Profiltiefe?', zahl: '1,6', einheit: 'mm', explanation: 'E' }, opts);
    expect(q.type).toBe('number');
    expect(q.numberAnswer).toEqual({ value: 1.6, unit: 'mm' });
    expect(q.answers).toBeUndefined();
  });
});

describe('importFlatRecords', () => {
  it('importiert die Beispiel-CSV mit 2 gültigen und 1 ungültigen Zeile', () => {
    const csv = readFileSync(join(import.meta.dirname, '../data/examples/beispiel-import.csv'), 'utf8');
    const rows = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: 'greedy' }).data;
    const result = importFlatRecords(rows, opts);
    expect(result.questions.map((q) => q.id)).toEqual(['off-1.1.99-001', 'off-1.2.99-002']);
    expect(result.questions[1]?.numberAnswer?.value).toBe(5);
    expect(new Set(result.errors.map((e) => e.row))).toEqual(new Set([3]));
  });

  it('meldet doppelte IDs', () => {
    const row = { officialNumber: '1.3.01-001', text: 'Frage?', points: 2, answer1: 'A', answer1correct: 'x', answer2: 'B', explanation: 'E' };
    const result = importFlatRecords([row, row], opts);
    expect(result.questions).toHaveLength(1);
    expect(result.errors[0]?.message).toMatch(/Doppelte ID/);
  });
});

describe('importJson', () => {
  it('übernimmt Fragen im Zielformat direkt', () => {
    const { source: _s, ...q } = choiceQuestion();
    const result = importJson([q], opts);
    expect(result.errors).toEqual([]);
    expect(result.questions[0]?.source).toBe('official');
  });

  it('akzeptiert eine vollständige Katalogdatei', () => {
    const result = importJson({ meta: { id: 'x', title: 'X', version: '1', source: 'custom' }, questions: [choiceQuestion()] }, opts);
    expect(result.questions).toHaveLength(1);
  });

  it('lehnt Nicht-Arrays ab', () => {
    expect(importJson('quatsch', opts).errors).toHaveLength(1);
  });
});
