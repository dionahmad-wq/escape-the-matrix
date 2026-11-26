import type { CategoryId } from './categories';
import { evaluateAnswer, isAnswered, type UserAnswer } from './answers';
import { shuffle, type Rng } from './selection';
import type { Material, Question } from './types';

/**
 * Prüfungslogik der theoretischen Fahrerlaubnisprüfung (Ersterwerb Klasse B):
 *  - 30 Fragen: 20 aus dem Grundstoff, 10 aus dem klassenspezifischen Zusatzstoff
 *  - insgesamt 110 Punkte
 *  - bestanden mit höchstens 10 Fehlerpunkten,
 *    aber NICHT bestanden, wenn zwei 5-Punkte-Fragen falsch sind (obwohl das „nur“ 10 Punkte sind)
 */
export interface ExamConfig {
  id: string;
  label: string;
  licenseClass: string;
  grundstoffCount: number;
  zusatzstoffCount: number;
  targetPoints: number;
  maxErrorPoints: number;
  /** Ab so vielen falschen 5-Punkte-Fragen ist die Prüfung nicht bestanden. */
  failOnFivePointErrors: number;
  durationMinutes: number;
}

export const EXAM_CONFIG_B: ExamConfig = {
  id: 'B',
  label: 'Klasse B (Ersterwerb)',
  licenseClass: 'B',
  grundstoffCount: 20,
  zusatzstoffCount: 10,
  targetPoints: 110,
  maxErrorPoints: 10,
  failOnFivePointErrors: 2,
  /** Trainingswert (einstellbar) – keine amtliche Vorgabe. */
  durationMinutes: 45,
};

const sumPoints = (qs: Question[]) => qs.reduce((s, q) => s + q.points, 0);

/** Wählt n Fragen so, dass möglichst viele Kategorien vertreten sind (Round-Robin). */
function pickStratified(pool: Question[], n: number, rng: Rng): Question[] {
  const groups = new Map<CategoryId, Question[]>();
  for (const q of shuffle(pool, rng)) {
    const g = groups.get(q.category) ?? [];
    g.push(q);
    groups.set(q.category, g);
  }
  const order = shuffle([...groups.keys()], rng);
  const picked: Question[] = [];
  while (picked.length < n) {
    let progressed = false;
    for (const cat of order) {
      const q = groups.get(cat)!.shift();
      if (q) {
        picked.push(q);
        progressed = true;
        if (picked.length >= n) break;
      }
    }
    if (!progressed) break;
  }
  return picked;
}

/**
 * Stellt einen Prüfungsbogen zusammen. Nach der gestreuten Auswahl werden
 * Fragen gleichen Stoffs (bevorzugt gleicher Kategorie) getauscht, bis die
 * Punktsumme dem Ziel (110) entspricht oder ihm so nah wie möglich kommt.
 */
export function composeExam(questions: readonly Question[], config: ExamConfig, rng: Rng = Math.random): Question[] {
  const eligible = questions.filter((q) => q.licenseClasses.includes(config.licenseClass));
  const pools: Record<Material, Question[]> = {
    grundstoff: eligible.filter((q) => q.material === 'grundstoff'),
    zusatzstoff: eligible.filter((q) => q.material === 'zusatzstoff'),
  };
  const selected = {
    grundstoff: pickStratified(pools.grundstoff, config.grundstoffCount, rng),
    zusatzstoff: pickStratified(pools.zusatzstoff, config.zusatzstoffCount, rng),
  };

  const complete =
    selected.grundstoff.length === config.grundstoffCount && selected.zusatzstoff.length === config.zusatzstoffCount;

  if (complete) {
    const materials: Material[] = ['grundstoff', 'zusatzstoff'];
    for (let iter = 0; iter < 3000; iter++) {
      const diff = sumPoints([...selected.grundstoff, ...selected.zusatzstoff]) - config.targetPoints;
      if (diff === 0) break;
      const mat = materials[Math.floor(rng() * 2)]!;
      const list = selected[mat];
      const idx = Math.floor(rng() * list.length);
      const out = list[idx]!;
      const ids = new Set(list.map((q) => q.id));
      // Kandidaten, die die Abweichung verringern
      const candidates = pools[mat].filter(
        (q) => !ids.has(q.id) && Math.abs(diff - out.points + q.points) < Math.abs(diff),
      );
      if (!candidates.length) continue;
      const sameCat = candidates.filter((q) => q.category === out.category);
      const pool = sameCat.length && rng() < 0.8 ? sameCat : candidates;
      list[idx] = pool[Math.floor(rng() * pool.length)]!;
    }
  }

  return [...shuffle(selected.grundstoff, rng), ...shuffle(selected.zusatzstoff, rng)];
}

export interface ExamQuestionResult {
  id: string;
  correct: boolean;
  answered: boolean;
  points: number;
  category: CategoryId;
  material: Material;
}

export interface ExamScore {
  totalPoints: number;
  errorPoints: number;
  fivePointErrors: number;
  correctCount: number;
  answeredCount: number;
  passed: boolean;
  /** Warum nicht bestanden (leer bei bestanden). */
  failReasons: string[];
  results: ExamQuestionResult[];
  byCategory: Partial<Record<CategoryId, { total: number; wrong: number; errorPoints: number }>>;
  byMaterial: Record<Material, { total: number; wrong: number; errorPoints: number }>;
}

export function scoreExam(
  questions: readonly Question[],
  answers: Record<string, UserAnswer | undefined>,
  config: ExamConfig,
): ExamScore {
  const results: ExamQuestionResult[] = questions.map((q) => {
    const ev = evaluateAnswer(q, answers[q.id]);
    return { id: q.id, correct: ev.correct, answered: isAnswered(answers[q.id]), points: q.points, category: q.category, material: q.material };
  });

  const wrong = results.filter((r) => !r.correct);
  const errorPoints = wrong.reduce((s, r) => s + r.points, 0);
  const fivePointErrors = wrong.filter((r) => r.points === 5).length;

  const failReasons: string[] = [];
  if (errorPoints > config.maxErrorPoints) failReasons.push(`${errorPoints} Fehlerpunkte (erlaubt: höchstens ${config.maxErrorPoints})`);
  if (fivePointErrors >= config.failOnFivePointErrors) failReasons.push(`${fivePointErrors} falsch beantwortete 5-Punkte-Fragen`);

  const byCategory: ExamScore['byCategory'] = {};
  const byMaterial: ExamScore['byMaterial'] = {
    grundstoff: { total: 0, wrong: 0, errorPoints: 0 },
    zusatzstoff: { total: 0, wrong: 0, errorPoints: 0 },
  };
  for (const r of results) {
    const c = (byCategory[r.category] ??= { total: 0, wrong: 0, errorPoints: 0 });
    const m = byMaterial[r.material];
    c.total++;
    m.total++;
    if (!r.correct) {
      c.wrong++;
      c.errorPoints += r.points;
      m.wrong++;
      m.errorPoints += r.points;
    }
  }

  return {
    totalPoints: sumPoints([...questions]),
    errorPoints,
    fivePointErrors,
    correctCount: results.length - wrong.length,
    answeredCount: results.filter((r) => r.answered).length,
    passed: failReasons.length === 0,
    failReasons,
    results,
    byCategory,
    byMaterial,
  };
}

/** Gespeicherter Prüfungsdurchlauf (Historie). */
export interface ExamRecord {
  id: string;
  configId: string;
  startedAt: number;
  finishedAt: number;
  durationSec: number;
  timedOut: boolean;
  questionIds: string[];
  answers: Record<string, UserAnswer>;
  totalPoints: number;
  errorPoints: number;
  fivePointErrors: number;
  correctCount: number;
  passed: boolean;
}
