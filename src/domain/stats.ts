import { CATEGORY_LIST, CATEGORIES, type CategoryId } from './categories';
import type { ExamRecord } from './exam';
import { getStatus, isDueForReview, weaknessScore, type ProgressMap } from './progress';
import type { Question } from './types';

export interface CategoryStat {
  id: CategoryId;
  label: string;
  total: number;
  seen: number;
  mastered: number;
  wrongNow: number;
  correctAnswers: number;
  wrongAnswers: number;
  /** Anteil richtiger Antworten (0–1) oder null, wenn noch nichts beantwortet. */
  accuracy: number | null;
  masteryShare: number;
}

export function computeCategoryStats(questions: readonly Question[], progress: ProgressMap): CategoryStat[] {
  return CATEGORY_LIST.map((c) => {
    const qs = questions.filter((q) => q.category === c.id);
    let seen = 0, mastered = 0, wrongNow = 0, correctAnswers = 0, wrongAnswers = 0;
    for (const q of qs) {
      const p = progress[q.id];
      if (!p) continue;
      seen++;
      if (p.mastered) mastered++;
      if (p.lastResult === 'wrong') wrongNow++;
      correctAnswers += p.correct;
      wrongAnswers += p.wrong;
    }
    const answers = correctAnswers + wrongAnswers;
    return {
      id: c.id,
      label: c.label,
      total: qs.length,
      seen,
      mastered,
      wrongNow,
      correctAnswers,
      wrongAnswers,
      accuracy: answers ? correctAnswers / answers : null,
      masteryShare: qs.length ? mastered / qs.length : 0,
    };
  });
}

export interface OverallStats {
  total: number;
  seen: number;
  mastered: number;
  learning: number;
  wrongNow: number;
  unsure: number;
  weak: number;
  due: number;
  answers: number;
  correctAnswers: number;
  accuracy: number | null;
  masteryShare: number;
}

export function computeOverall(questions: readonly Question[], progress: ProgressMap, now: number): OverallStats {
  const s: OverallStats = {
    total: questions.length, seen: 0, mastered: 0, learning: 0, wrongNow: 0, unsure: 0, weak: 0, due: 0,
    answers: 0, correctAnswers: 0, accuracy: null, masteryShare: 0,
  };
  for (const q of questions) {
    const p = progress[q.id];
    if (!p) continue;
    s.seen++;
    const status = getStatus(p);
    if (status === 'mastered') s.mastered++;
    if (status === 'learning') s.learning++;
    if (status === 'wrong') s.wrongNow++;
    if (p.unsure) s.unsure++;
    if (weaknessScore(p) !== null) s.weak++;
    if (isDueForReview(p, now)) s.due++;
    s.answers += p.seen;
    s.correctAnswers += p.correct;
  }
  s.accuracy = s.answers ? s.correctAnswers / s.answers : null;
  s.masteryShare = s.total ? s.mastered / s.total : 0;
  return s;
}

// ---------- Tagesaktivität & Lernserie ----------

export type ActivityMap = Record<string, { answered: number; correct: number }>;

/** Lokales Datum als "YYYY-MM-DD". */
export function dayKey(date: Date | number): string {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Anzahl aufeinanderfolgender Tage, an denen das Tagesziel erreicht wurde.
 * Ist es heute noch nicht erreicht, zählt die Serie ab gestern (sie ist noch nicht verloren).
 */
export function computeStreak(activity: ActivityMap, goal: number, today: Date = new Date()): number {
  const met = (d: Date) => (activity[dayKey(d)]?.answered ?? 0) >= goal;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!met(cursor)) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (met(cursor)) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Die letzten n Tage (ältester zuerst) mit Aktivität. */
export function lastDays(activity: ActivityMap, n: number, today: Date = new Date()) {
  const out: { key: string; date: Date; answered: number; correct: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const a = activity[dayKey(d)];
    out.push({ key: dayKey(d), date: d, answered: a?.answered ?? 0, correct: a?.correct ?? 0 });
  }
  return out;
}

// ---------- Prüfungsreife & Empfehlungen ----------

export interface Readiness {
  /** 0–100 */
  score: number;
  ready: boolean;
  label: string;
  recentPassRate: number | null;
}

export function computeReadiness(overall: OverallStats, exams: readonly ExamRecord[]): Readiness {
  const recent = [...exams].sort((a, b) => b.finishedAt - a.finishedAt).slice(0, 5);
  const recentPassRate = recent.length ? recent.filter((e) => e.passed).length / recent.length : null;
  const mastery = overall.masteryShare;
  const score = Math.round(100 * (recentPassRate === null ? mastery * 0.7 : mastery * 0.5 + recentPassRate * 0.5));
  const lastThreePassed = recent.length >= 3 && recent.slice(0, 3).every((e) => e.passed);
  const ready = lastThreePassed && mastery >= 0.8;
  const label = ready
    ? 'Prüfungsreif'
    : score >= 70
      ? 'Fast prüfungsreif'
      : score >= 35
        ? 'Auf gutem Weg'
        : overall.seen === 0
          ? 'Noch nicht gestartet'
          : 'Am Anfang';
  return { score, ready, label, recentPassRate };
}

export type RecommendationAction =
  | { kind: 'quick' }
  | { kind: 'weakness' }
  | { kind: 'review' }
  | { kind: 'topic'; category: CategoryId }
  | { kind: 'new' }
  | { kind: 'exam' };

export interface Recommendation {
  id: string;
  tone: 'info' | 'warning' | 'success';
  title: string;
  text: string;
  action: RecommendationAction;
  actionLabel: string;
}

/** Leitet konkrete, priorisierte Lernempfehlungen aus dem Lernstand ab. */
export function buildRecommendations(
  questions: readonly Question[],
  progress: ProgressMap,
  exams: readonly ExamRecord[],
  now: number,
): Recommendation[] {
  const overall = computeOverall(questions, progress, now);
  const cats = computeCategoryStats(questions, progress);
  const recs: Recommendation[] = [];

  if (overall.seen === 0) {
    recs.push({
      id: 'start', tone: 'info', title: 'Los geht’s!',
      text: 'Starte mit einer schnellen Runde, um einen ersten Eindruck zu bekommen.',
      action: { kind: 'quick' }, actionLabel: 'Schnelle Runde',
    });
    return recs;
  }

  if (overall.weak > 0) {
    recs.push({
      id: 'weak', tone: 'warning', title: `${overall.weak} ${overall.weak === 1 ? 'Frage braucht' : 'Fragen brauchen'} Übung`,
      text: 'Falsch oder unsicher beantwortete Fragen solltest du zeitnah wiederholen, solange die Erklärung noch frisch ist.',
      action: { kind: 'weakness' }, actionLabel: 'Schwächen trainieren',
    });
  }

  const weakest = cats
    .filter((c) => c.accuracy !== null && c.correctAnswers + c.wrongAnswers >= 5 && c.accuracy < 0.75)
    .sort((a, b) => (a.accuracy ?? 1) - (b.accuracy ?? 1))[0];
  if (weakest) {
    recs.push({
      id: `topic-${weakest.id}`, tone: 'warning', title: `Schwachstelle: ${weakest.label}`,
      text: `Nur ${Math.round((weakest.accuracy ?? 0) * 100)} % richtig in diesem Bereich. Ein gezieltes Themen-Training hilft.`,
      action: { kind: 'topic', category: weakest.id }, actionLabel: 'Thema üben',
    });
  }

  if (overall.due > 0) {
    recs.push({
      id: 'review', tone: 'info', title: `${overall.due} Wiederholungen fällig`,
      text: 'Gemeisterte Fragen kurz auffrischen, damit sie bis zur Prüfung sitzen.',
      action: { kind: 'review' }, actionLabel: 'Wiederholen',
    });
  }

  const unseen = overall.total - overall.seen;
  const leastCovered = cats.filter((c) => c.total > 0).sort((a, b) => a.seen / a.total - b.seen / b.total)[0];
  if (unseen > 0 && leastCovered && leastCovered.seen < leastCovered.total) {
    recs.push({
      id: 'new', tone: 'info', title: `${unseen} Fragen noch nie bearbeitet`,
      text: `Am wenigsten bearbeitet: ${leastCovered.label} (${leastCovered.seen}/${leastCovered.total}).`,
      action: { kind: 'topic', category: leastCovered.id }, actionLabel: 'Neue Fragen',
    });
  }

  const readiness = computeReadiness(overall, exams);
  const lastExam = [...exams].sort((a, b) => b.finishedAt - a.finishedAt)[0];
  if (readiness.ready) {
    recs.push({
      id: 'ready', tone: 'success', title: 'Du bist prüfungsreif! 🎉',
      text: 'Die letzten drei Simulationen bestanden und über 80 % der Fragen gemeistert. Halte das Niveau mit kurzen Runden.',
      action: { kind: 'exam' }, actionLabel: 'Noch eine Simulation',
    });
  } else if (overall.masteryShare >= 0.5 && (!lastExam || now - lastExam.finishedAt > 2 * 24 * 3600 * 1000)) {
    recs.push({
      id: 'exam', tone: 'info', title: 'Zeit für eine Prüfungssimulation',
      text: 'Teste unter echten Bedingungen mit 30 Fragen, Zeitlimit und Fehlerpunkten.',
      action: { kind: 'exam' }, actionLabel: 'Simulation starten',
    });
  }

  return recs.slice(0, 4);
}

export function categoryLabel(id: CategoryId): string {
  return CATEGORIES[id].label;
}
