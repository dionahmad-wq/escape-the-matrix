import { describe, expect, it } from 'vitest';
import { CatalogFileSchema, QuestionSchema } from '../src/domain/schema';
import { choiceQuestion, numberQuestion } from './fixtures';

const messages = (input: unknown) => {
  const r = QuestionSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe('QuestionSchema', () => {
  it('akzeptiert gültige Auswahl- und Zahlenfragen', () => {
    expect(QuestionSchema.safeParse(choiceQuestion()).success).toBe(true);
    expect(QuestionSchema.safeParse(numberQuestion()).success).toBe(true);
  });

  it('setzt Lizenzklasse B als Standard', () => {
    expect(QuestionSchema.parse(choiceQuestion()).licenseClasses).toEqual(['B']);
  });

  it('verlangt bei "single" genau eine richtige Antwort', () => {
    const q = choiceQuestion({
      answers: [
        { id: 'a', text: 'A', correct: true },
        { id: 'b', text: 'B', correct: true },
      ],
    });
    expect(messages(q).join()).toMatch(/genau 1 richtige/);
  });

  it('verlangt bei "multiple" mindestens eine richtige Antwort', () => {
    const q = choiceQuestion({
      type: 'multiple',
      answers: [
        { id: 'a', text: 'A', correct: false },
        { id: 'b', text: 'B', correct: false },
      ],
    });
    expect(messages(q).join()).toMatch(/mindestens 1 richtige/);
  });

  it('lehnt doppelte Antwort-IDs ab', () => {
    const q = choiceQuestion({
      answers: [
        { id: 'a', text: 'A', correct: true },
        { id: 'a', text: 'B', correct: false },
      ],
    });
    expect(messages(q).join()).toMatch(/eindeutig/);
  });

  it('verlangt numberAnswer bei Zahlenfragen und verbietet answers', () => {
    expect(messages(numberQuestion({ numberAnswer: undefined })).join()).toMatch(/numberAnswer/);
    expect(messages(numberQuestion({ answers: [{ id: 'a', text: 'x', correct: true }, { id: 'b', text: 'y', correct: false }] })).join()).toMatch(
      /keine "answers"/,
    );
  });

  it('erlaubt nur 2–5 Punkte', () => {
    expect(QuestionSchema.safeParse(choiceQuestion({ points: 1 as never })).success).toBe(false);
    expect(QuestionSchema.safeParse(choiceQuestion({ points: 6 as never })).success).toBe(false);
    expect(messages(choiceQuestion({ points: 6 as never }))).toContain('Punkte müssen 2, 3, 4 oder 5 sein');
  });

  it('prüft das Format der amtlichen Fragenummer', () => {
    expect(QuestionSchema.safeParse(choiceQuestion({ officialNumber: '1.1.02-001' })).success).toBe(true);
    expect(QuestionSchema.safeParse(choiceQuestion({ officialNumber: '2.2.03-104-M' })).success).toBe(true);
    expect(QuestionSchema.safeParse(choiceQuestion({ officialNumber: '1-1-02' })).success).toBe(false);
  });

  it('liefert deutsche Fehlermeldungen', () => {
    const { text: _text, ...withoutText } = choiceQuestion();
    expect(messages(withoutText)).toContain('Pflichtfeld fehlt');
  });
});

describe('CatalogFileSchema', () => {
  it('vererbt source und version aus meta an die Fragen', () => {
    const { source: _s, ...q } = choiceQuestion();
    const file = CatalogFileSchema.parse({
      meta: { id: 'test', title: 'Test', version: '1.0', source: 'official' },
      questions: [q],
    });
    expect(file.questions[0]?.source).toBe('official');
    expect(file.questions[0]?.version).toBe('1.0');
  });

  it('lässt explizite Werte der Frage unangetastet', () => {
    const file = CatalogFileSchema.parse({
      meta: { id: 'test', title: 'Test', version: '1.0', source: 'official' },
      questions: [choiceQuestion({ source: 'custom' })],
    });
    expect(file.questions[0]?.source).toBe('custom');
  });
});
