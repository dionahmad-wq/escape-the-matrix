import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { computeCatalogStats, loadCatalog } from '../src/domain/catalog';
import { readCatalogFiles } from '../scripts/lib/catalogFiles';
import { choiceQuestion, numberQuestion } from './fixtures';

const meta = (id: string) => ({ id, title: id, version: '1', source: 'seed' as const });

describe('loadCatalog', () => {
  it('vereint mehrere Dateien', () => {
    const c = loadCatalog([
      { name: 'a.json', data: { meta: meta('a'), questions: [choiceQuestion()] } },
      { name: 'b.json', data: { meta: meta('b'), questions: [numberQuestion()] } },
    ]);
    expect(c.questions).toHaveLength(2);
    expect(c.byId.get('q-num')?.type).toBe('number');
    expect(c.issues).toEqual([]);
  });

  it('überspringt doppelte IDs dateiübergreifend und meldet sie', () => {
    const c = loadCatalog([
      { name: 'a.json', data: { meta: meta('a'), questions: [choiceQuestion()] } },
      { name: 'b.json', data: { meta: meta('b'), questions: [choiceQuestion({ text: 'Duplikat-Frage' })] } },
    ]);
    expect(c.questions).toHaveLength(1);
    expect(c.issues[0]).toMatchObject({ file: 'b.json', severity: 'error', questionId: 'q-1' });
  });

  it('behält gültige Fragen, wenn einzelne Fragen ungültig sind', () => {
    const c = loadCatalog([
      {
        name: 'a.json',
        data: { meta: meta('a'), questions: [choiceQuestion(), numberQuestion({ numberAnswer: undefined })] },
      },
    ]);
    expect(c.questions.map((q) => q.id)).toEqual(['q-1']);
    expect(c.issues).toHaveLength(1);
    expect(c.issues[0]?.path).toBe('questions[1].numberAnswer');
  });

  it('meldet komplett ungültige Dateien', () => {
    const c = loadCatalog([{ name: 'kaputt.json', data: { foo: 1 } }]);
    expect(c.questions).toHaveLength(0);
    expect(c.issues.length).toBeGreaterThan(0);
  });

  it('warnt bei doppelter amtlicher Nummer', () => {
    const c = loadCatalog([
      {
        name: 'a.json',
        data: {
          meta: meta('a'),
          questions: [
            choiceQuestion({ officialNumber: '1.3.01-001' }),
            choiceQuestion({ id: 'q-2', officialNumber: '1.3.01-001' }),
          ],
        },
      },
    ]);
    expect(c.questions).toHaveLength(2);
    expect(c.issues[0]?.severity).toBe('warning');
  });

  it('zählt Statistiken', () => {
    const c = loadCatalog([{ name: 'a.json', data: { meta: meta('a'), questions: [choiceQuestion(), numberQuestion()] } }]);
    const s = computeCatalogStats(c.questions);
    expect(s).toMatchObject({ total: 2, byMaterial: { grundstoff: 2 }, byType: { single: 1, number: 1 } });
  });
});

describe('Seed-Datensatz', () => {
  it('ist vollständig gültig', () => {
    const c = loadCatalog(readCatalogFiles(['data/seed']));
    expect(c.issues).toEqual([]);
    expect(c.questions.length).toBeGreaterThan(0);
  });

  it('hat für jede Abbildung eine vorhandene Bilddatei', () => {
    const c = loadCatalog(readCatalogFiles(['data/seed']));
    const withMedia = c.questions.filter((q) => q.media);
    expect(withMedia.length).toBeGreaterThan(0);
    const missing = withMedia.filter((q) => !q.media!.src || !existsSync(join(import.meta.dirname, '../public/media', q.media!.src)));
    expect(missing.map((q) => q.id)).toEqual([]);
  });
});
