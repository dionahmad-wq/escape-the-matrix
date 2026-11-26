import type { Question } from './types';

/** Antwort eines Nutzers auf eine Frage. */
export type UserAnswer =
  | { kind: 'choice'; selected: string[] }
  | { kind: 'number'; value: number | null };

export interface AnswerEvaluation {
  correct: boolean;
  answered: boolean;
  /** IDs aller richtigen Antwortoptionen. */
  correctIds: string[];
  /** Angekreuzt, aber falsch. */
  selectedWrong: string[];
  /** Richtig, aber nicht angekreuzt. */
  missed: string[];
  expected?: number;
  given?: number | null;
}

export function emptyAnswer(question: Question): UserAnswer {
  return question.type === 'number' ? { kind: 'number', value: null } : { kind: 'choice', selected: [] };
}

export function isAnswered(answer: UserAnswer | undefined): boolean {
  if (!answer) return false;
  return answer.kind === 'choice' ? answer.selected.length > 0 : answer.value !== null;
}

/** Wandelt eine Eingabe wie "1,6" oder " 40 " in eine Zahl um; ungültig → null. */
export function parseNumberInput(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  return Number(t);
}

export function formatNumber(value: number): string {
  return value.toLocaleString('de-DE', { maximumFractionDigits: 3 });
}

/**
 * Wählt eine Antwortoption an bzw. ab.
 * mode "radio": genau eine Option (Übungsmodus bei Typ "single").
 * mode "checkbox": beliebig viele (Mehrfachauswahl und Prüfungsmodus).
 */
export function toggleChoice(answer: UserAnswer, optionId: string, mode: 'radio' | 'checkbox'): UserAnswer {
  const selected = answer.kind === 'choice' ? answer.selected : [];
  if (mode === 'radio') return { kind: 'choice', selected: [optionId] };
  return {
    kind: 'choice',
    selected: selected.includes(optionId) ? selected.filter((id) => id !== optionId) : [...selected, optionId],
  };
}

export function evaluateAnswer(question: Question, answer: UserAnswer | undefined): AnswerEvaluation {
  if (question.type === 'number') {
    const expected = question.numberAnswer?.value ?? NaN;
    const tolerance = question.numberAnswer?.tolerance ?? 0;
    const given = answer?.kind === 'number' ? answer.value : null;
    const correct = given !== null && Math.abs(given - expected) <= tolerance + 1e-9;
    return { correct, answered: given !== null, correctIds: [], selectedWrong: [], missed: [], expected, given };
  }

  const options = question.answers ?? [];
  const correctIds = options.filter((o) => o.correct).map((o) => o.id);
  const selected = answer?.kind === 'choice' ? answer.selected : [];
  const selectedWrong = selected.filter((id) => !correctIds.includes(id));
  const missed = correctIds.filter((id) => !selected.includes(id));
  return {
    correct: selectedWrong.length === 0 && missed.length === 0,
    answered: selected.length > 0,
    correctIds,
    selectedWrong,
    missed,
  };
}

/** Kurzer, verständlicher Hinweis, was genau falsch war. */
export function describeMistake(question: Question, evaluation: AnswerEvaluation): string | null {
  if (evaluation.correct) return null;
  if (!evaluation.answered) return 'Nicht beantwortet: Diese Frage zählt als Fehler.';
  if (question.type === 'number') {
    return `Deine Antwort: ${formatNumber(evaluation.given ?? 0)}${question.numberAnswer?.unit ? ` ${question.numberAnswer.unit}` : ''}, richtig wäre ${formatNumber(evaluation.expected ?? 0)}${question.numberAnswer?.unit ? ` ${question.numberAnswer.unit}` : ''}.`;
  }
  const parts: string[] = [];
  const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
  if (evaluation.selectedWrong.length) parts.push(`${n(evaluation.selectedWrong.length, 'falsche Antwort', 'falsche Antworten')} angekreuzt`);
  if (evaluation.missed.length) parts.push(`${n(evaluation.missed.length, 'richtige Antwort', 'richtige Antworten')} übersehen`);
  return `Du hast ${parts.join(' und ')}. Schon ein Fehler macht die ganze Frage falsch.`;
}
