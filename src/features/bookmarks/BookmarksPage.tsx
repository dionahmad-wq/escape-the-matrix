import { PlayCircle } from 'lucide-react';
import { catalog } from '@/data/catalog';
import { QuestionListItem } from '@/components/QuestionListItem';
import { Button, EmptyState, PageTitle } from '@/components/ui';
import { usePracticeLauncher } from '@/features/practice/usePracticeLauncher';
import { useAppStore } from '@/store/useAppStore';

export function BookmarksPage() {
  const bookmarks = useAppStore((s) => s.bookmarks);
  const progress = useAppStore((s) => s.progress);
  const launcher = usePracticeLauncher();
  const questions = catalog.questions
    .filter((q) => bookmarks[q.id])
    .sort((a, b) => (bookmarks[b.id] ?? 0) - (bookmarks[a.id] ?? 0));

  return (
    <div>
      <PageTitle sub="Markierte Fragen zum gezielten Wiederholen. Markieren geht beim Lernen mit B oder dem Lesezeichen-Symbol.">Lesezeichen</PageTitle>
      {questions.length === 0 ? (
        <EmptyState title="Noch keine Lesezeichen">Markiere beim Lernen schwierige Fragen, um sie hier gesammelt zu üben.</EmptyState>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">{questions.length} Fragen</p>
            <Button onClick={() => launcher.bookmarks()}>
              <PlayCircle size={18} /> Alle üben
            </Button>
          </div>
          <ul className="space-y-2">
            {questions.map((q) => (
              <QuestionListItem key={q.id} question={q} progress={progress[q.id]} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
