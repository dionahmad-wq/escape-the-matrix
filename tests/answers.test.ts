import { describe, expect, it } from 'vitest';
import { describeMistake, evaluateAnswer, isAnswered, parseNumberInput, toggleChoice } from '../src/domain/answers';
import { QuestionSchema } from '../src/domain/schema';
import { choiceQuestion, numberQuestion } from './fixtures';

const multi = QuestionSchema.parse(
  choiceQuestion({
    type: 'multiple',
    answers: [
      { id: 'a', text: 'A', correct: true },
      { id: 'b', text: 'B', correct: true },
      { id: 'c', text: 'C', correct: false },
    ],
  }),
);
const num = QuestionSchema.parse(numberQuestion({ numberAnswer: { value: 1.6, unit: 'mm' } }));

describe('parseNumberInput', () => {
  it.each([
    ['15', 15],
    [' 1,6 ', 1.6],
    ['1.6', 1.6],
    ['3 500', 3500],
    ['-2', -2],
    ['', null],
    ['abc', null],
    ['1,2,3', null],
  ])('%j → %j', (input, expected) => {
    expect(parseNumberInput(input)).toBe(expected);
  });
});

describe('evaluateAnswer', () => {
  it('verlangt alle richtigen und keine falschen Antworten', () => {
    expect(evaluateAnswer(multi, { kind: 'choice', selected: ['a', 'b'] }).correct).toBe(true);
    const missing = evaluateAnswer(multi, { kind: 'choice', selected: ['a'] });
    expect(missing).toMatchObject({ correct: false, missed: ['b'], selectedWrong: [] });
    const extra = evaluateAnswer(multi, { kind: 'choice', selected: ['a', 'b', 'c'] });
    expect(extra).toMatchObject({ correct: false, selectedWrong: ['c'] });
  });

  it('wertet Zahlenantworten (mit Toleranz) aus', () => {
    expect(evaluateAnswer(num, { kind: 'number', value: 1.6 }).correct).toBe(true);
    expect(evaluateAnswer(num, { kind: 'number', value: 1.5 }).correct).toBe(false);
    const tol = QuestionSchema.parse(numberQuestion({ numberAnswer: { value: 40, tolerance: 1 } }));
    expect(evaluateAnswer(tol, { kind: 'number', value: 41 }).correct).toBe(true);
  });

  it('wertet fehlende Antworten als falsch und unbeantwortet', () => {
    expect(evaluateAnswer(multi, undefined)).toMatchObject({ correct: false, answered: false });
    expect(isAnswered({ kind: 'number', value: null })).toBe(false);
  });
});

describe('toggleChoice', () => {
  it('radio ersetzt, checkbox schaltet um', () => {
    const a = toggleChoice({ kind: 'choice', selected: ['a'] }, 'b', 'radio');
    expect(a).toEqual({ kind: 'choice', selected: ['b'] });
    const b = toggleChoice({ kind: 'choice', selected: ['a'] }, 'b', 'checkbox');
    expect(b).toEqual({ kind: 'choice', selected: ['a', 'b'] });
    expect(toggleChoice(b, 'a', 'checkbox')).toEqual({ kind: 'choice', selected: ['b'] });
  });
});

describe('describeMistake', () => {
  it('erklärt übersehene und falsch angekreuzte Antworten', () => {
    const ev = evaluateAnswer(multi, { kind: 'choice', selected: ['a', 'c'] });
    expect(describeMistake(multi, ev)).toMatch(/1 falsche Antwort angekreuzt und 1 richtige Antwort übersehen/);
  });
  it('nennt bei Zahlenfragen den richtigen Wert', () => {
    const ev = evaluateAnswer(num, { kind: 'number', value: 2 });
    expect(describeMistake(num, ev)).toMatch(/richtig wäre 1,6 mm/);
  });
});
