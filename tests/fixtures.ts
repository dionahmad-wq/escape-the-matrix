import type { QuestionInput } from '../src/domain/types';

export function choiceQuestion(overrides: Partial<QuestionInput> = {}): QuestionInput {
  return {
    id: 'q-1',
    category: 'vorfahrt',
    material: 'grundstoff',
    type: 'single',
    points: 4,
    text: 'Wer darf zuerst fahren?',
    answers: [
      { id: 'a', text: 'Ich', correct: false },
      { id: 'b', text: 'Der andere', correct: true },
    ],
    explanation: 'Rechts vor links.',
    source: 'seed',
    ...overrides,
  };
}

export function numberQuestion(overrides: Partial<QuestionInput> = {}): QuestionInput {
  return {
    id: 'q-num',
    category: 'verhalten',
    material: 'grundstoff',
    type: 'number',
    points: 3,
    text: 'Wie lang ist der Reaktionsweg bei 50 km/h?',
    numberAnswer: { value: 15, unit: 'm' },
    explanation: '(50/10)*3 = 15',
    source: 'seed',
    ...overrides,
  };
}
