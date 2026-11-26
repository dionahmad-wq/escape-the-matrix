import { useNavigate } from 'react-router-dom';
import { catalog } from '@/data/catalog';
import { CATEGORIES, type CategoryId } from '@/domain/categories';
import { parseSubtopicKey, subtopicKey } from '@/domain/subtopics';
import { selectDueQuestions, selectQuickRound, selectWeakQuestions, shuffle } from '@/domain/selection';
import { useAppStore, type PracticeMode } from '@/store/useAppStore';
import { resetPracticeExitTarget } from './PracticePage';

/** Startet Lernsitzungen der verschiedenen Modi und öffnet die Lernansicht. */
export function usePracticeLauncher() {
  const navigate = useNavigate();
  const startPractice = useAppStore((s) => s.startPractice);

  const start = (mode: PracticeMode, title: string, ids: string[]) => {
    if (!ids.length) return false;
    resetPracticeExitTarget();
    startPractice(mode, title, ids);
    navigate('/lernen');
    return true;
  };

  return {
    start,
    quick: () => {
      const { progress, settings } = useAppStore.getState();
      const qs = selectQuickRound(catalog.questions, progress, settings.quickRoundSize, Date.now());
      return start('quick', 'Schnelle Runde', qs.map((q) => q.id));
    },
    weakness: (limit = 20) => {
      const { progress } = useAppStore.getState();
      const qs = selectWeakQuestions(catalog.questions, progress, limit);
      return start('weakness', 'Schwächen-Training', shuffle(qs).map((q) => q.id));
    },
    review: (limit = 20) => {
      const { progress } = useAppStore.getState();
      const qs = selectDueQuestions(catalog.questions, progress, Date.now()).slice(0, limit);
      return start('review', 'Wiederholung', qs.map((q) => q.id));
    },
    bookmarks: () => {
      const { bookmarks } = useAppStore.getState();
      const ids = catalog.questions.filter((q) => bookmarks[q.id]).map((q) => q.id);
      return start('bookmarks', 'Lesezeichen', shuffle(ids));
    },
    /** Thema (optional eingeschränkt auf ein Unterthema): nicht gemeisterte zuerst, max. 15 Fragen. */
    topic: (category: CategoryId, subtopic?: string) => {
      const { progress } = useAppStore.getState();
      const qs = catalog.questions.filter((q) => q.category === category && (!subtopic || subtopicKey(q) === subtopic));
      const unmastered = shuffle(qs.filter((q) => !progress[q.id]?.mastered));
      const mastered = shuffle(qs.filter((q) => progress[q.id]?.mastered));
      const ids = [...unmastered, ...mastered].slice(0, 15).map((q) => q.id);
      const title = subtopic ? `${CATEGORIES[category].short}: ${parseSubtopicKey(subtopic).label}` : `Thema: ${CATEGORIES[category].label}`;
      return start('topic', title, ids);
    },
  };
}
