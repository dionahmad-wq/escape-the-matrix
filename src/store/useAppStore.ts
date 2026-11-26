import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { UserAnswer } from '@/domain/answers';
import type { ExamRecord } from '@/domain/exam';
import { applyAnswer, type ProgressMap } from '@/domain/progress';
import { dayKey, type ActivityMap } from '@/domain/stats';

export const STORAGE_KEY = 'fuehrerschein-theorie-trainer';
export const STORAGE_VERSION = 1;
const MAX_EXAM_HISTORY = 100;

export type PracticeMode = 'topic' | 'weakness' | 'quick' | 'review' | 'bookmarks' | 'retry' | 'custom';

export interface PracticeAnswerRecord {
  answer: UserAnswer;
  correct: boolean;
  unsure: boolean;
}

export interface PracticeSession {
  id: string;
  mode: PracticeMode;
  title: string;
  questionIds: string[];
  index: number;
  answers: Record<string, PracticeAnswerRecord>;
  startedAt: number;
  finishedAt?: number;
}

export interface ActiveExam {
  id: string;
  configId: string;
  questionIds: string[];
  answers: Record<string, UserAnswer>;
  flagged: string[];
  index: number;
  startedAt: number;
  /** Zeitpunkt (ms), zu dem die Zeit abläuft; null = ohne Zeitlimit. */
  deadline: number | null;
}

export interface Settings {
  dailyGoal: number;
  quickRoundSize: number;
  examMinutes: number;
  /** Erklärung nach dem Prüfen automatisch ausklappen. */
  autoShowExplanation: boolean;
  /** Nach richtiger Antwort automatisch zur nächsten Frage (nach kurzer Pause). */
  autoAdvanceOnCorrect: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  dailyGoal: 20,
  quickRoundSize: 10,
  examMinutes: 45,
  autoShowExplanation: true,
  autoAdvanceOnCorrect: false,
};

/** Der Teil des Zustands, der gespeichert und gesichert (Backup) wird. */
export interface PersistedData {
  progress: ProgressMap;
  bookmarks: Record<string, number>;
  examHistory: ExamRecord[];
  activity: ActivityMap;
  settings: Settings;
  practice: PracticeSession | null;
  activeExam: ActiveExam | null;
}

interface Actions {
  recordAnswer: (questionId: string, correct: boolean, unsure: boolean) => void;
  toggleBookmark: (questionId: string) => void;

  startPractice: (mode: PracticeMode, title: string, questionIds: string[]) => void;
  answerPractice: (questionId: string, answer: UserAnswer, correct: boolean, unsure: boolean) => void;
  setPracticeIndex: (index: number) => void;
  finishPractice: () => void;
  clearPractice: () => void;

  startExam: (configId: string, questionIds: string[], minutes: number | null) => void;
  setExamAnswer: (questionId: string, answer: UserAnswer) => void;
  toggleExamFlag: (questionId: string) => void;
  setExamIndex: (index: number) => void;
  /** Speichert das Ergebnis in der Historie, verbucht die Antworten im Lernstand und beendet die Prüfung. */
  completeExam: (record: ExamRecord, correctness: Record<string, boolean>) => void;
  abortExam: () => void;

  updateSettings: (patch: Partial<Settings>) => void;
  replaceData: (data: Partial<PersistedData>) => void;
  resetAll: () => void;
}

export type AppState = PersistedData & Actions;

const initialData: PersistedData = {
  progress: {},
  bookmarks: {},
  examHistory: [],
  activity: {},
  settings: DEFAULT_SETTINGS,
  practice: null,
  activeExam: null,
};

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function withAnswer(state: PersistedData, questionId: string, correct: boolean, unsure: boolean, now: number) {
  const key = dayKey(now);
  const day = state.activity[key] ?? { answered: 0, correct: 0 };
  return {
    progress: { ...state.progress, [questionId]: applyAnswer(state.progress[questionId], correct, unsure, now) },
    activity: { ...state.activity, [key]: { answered: day.answered + 1, correct: day.correct + (correct ? 1 : 0) } },
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialData,

      recordAnswer: (questionId, correct, unsure) =>
        set((s) => withAnswer(s, questionId, correct, unsure, Date.now())),

      toggleBookmark: (questionId) =>
        set((s) => {
          const bookmarks = { ...s.bookmarks };
          if (bookmarks[questionId]) delete bookmarks[questionId];
          else bookmarks[questionId] = Date.now();
          return { bookmarks };
        }),

      startPractice: (mode, title, questionIds) =>
        set({
          practice: { id: newId(), mode, title, questionIds, index: 0, answers: {}, startedAt: Date.now() },
        }),

      answerPractice: (questionId, answer, correct, unsure) =>
        set((s) => {
          if (!s.practice || s.practice.answers[questionId]) return {};
          return {
            ...withAnswer(s, questionId, correct, unsure, Date.now()),
            practice: { ...s.practice, answers: { ...s.practice.answers, [questionId]: { answer, correct, unsure } } },
          };
        }),

      setPracticeIndex: (index) =>
        set((s) => (s.practice ? { practice: { ...s.practice, index } } : {})),

      finishPractice: () =>
        set((s) => (s.practice ? { practice: { ...s.practice, finishedAt: Date.now() } } : {})),

      clearPractice: () => set({ practice: null }),

      startExam: (configId, questionIds, minutes) => {
        const now = Date.now();
        set({
          activeExam: {
            id: newId(),
            configId,
            questionIds,
            answers: {},
            flagged: [],
            index: 0,
            startedAt: now,
            deadline: minutes ? now + minutes * 60_000 : null,
          },
        });
      },

      setExamAnswer: (questionId, answer) =>
        set((s) => (s.activeExam ? { activeExam: { ...s.activeExam, answers: { ...s.activeExam.answers, [questionId]: answer } } } : {})),

      toggleExamFlag: (questionId) =>
        set((s) => {
          if (!s.activeExam) return {};
          const flagged = s.activeExam.flagged.includes(questionId)
            ? s.activeExam.flagged.filter((id) => id !== questionId)
            : [...s.activeExam.flagged, questionId];
          return { activeExam: { ...s.activeExam, flagged } };
        }),

      setExamIndex: (index) => set((s) => (s.activeExam ? { activeExam: { ...s.activeExam, index } } : {})),

      completeExam: (record, correctness) =>
        set((s) => {
          let next: Pick<PersistedData, 'progress' | 'activity'> = { progress: s.progress, activity: s.activity };
          for (const [id, correct] of Object.entries(correctness)) {
            next = withAnswer({ ...s, ...next }, id, correct, false, record.finishedAt);
          }
          return {
            ...next,
            examHistory: [record, ...s.examHistory].slice(0, MAX_EXAM_HISTORY),
            activeExam: null,
          };
        }),

      abortExam: () => set({ activeExam: null }),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      replaceData: (data) =>
        set({
          ...initialData,
          ...data,
          settings: { ...DEFAULT_SETTINGS, ...data.settings },
        }),

      resetAll: () => set({ ...initialData }),
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): PersistedData => ({
        progress: s.progress,
        bookmarks: s.bookmarks,
        examHistory: s.examHistory,
        activity: s.activity,
        settings: s.settings,
        practice: s.practice,
        activeExam: s.activeExam,
      }),
      // Spätere Schemaänderungen hier migrieren (version 1 → 2 …)
      migrate: (persisted) => persisted as PersistedData,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedData>;
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...p.settings } };
      },
    },
  ),
);
