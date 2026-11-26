import { Bookmark, BookmarkCheck } from 'lucide-react';
import { CATEGORIES } from '@/domain/categories';
import { getStatus, STATUS_LABEL, type QuestionProgress } from '@/domain/progress';
import type { Question } from '@/domain/types';
import { useAppStore } from '@/store/useAppStore';
import { Explanation } from './QuestionView';
import { MediaPlaceholder } from './MediaPlaceholder';
import { Badge } from './ui';

const STATUS_TONE = { new: 'slate', wrong: 'rose', learning: 'blue', mastered: 'emerald' } as const;

/** Aufklappbarer Listeneintrag mit Status, Lesezeichen und Lösung. */
export function QuestionListItem({ question: q, progress }: { question: Question; progress?: QuestionProgress }) {
  const bookmarked = useAppStore((s) => !!s.bookmarks[q.id]);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);
  const status = getStatus(progress);

  return (
    <li className="rounded-xl border border-slate-200 bg-white">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
              <Badge>{CATEGORIES[q.category].short}</Badge>
              <Badge>{q.material === 'grundstoff' ? 'G' : 'Z'}</Badge>
              <Badge tone="blue">{q.points} P</Badge>
              {progress && (
                <span className="text-xs text-slate-400">
                  {progress.correct}✓ {progress.wrong}✗
                </span>
              )}
            </div>
            <p className="text-sm text-slate-800">{q.text}</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              toggleBookmark(q.id);
            }}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
            aria-pressed={bookmarked}
            aria-label={bookmarked ? 'Lesezeichen entfernen' : 'Lesezeichen setzen'}
          >
            {bookmarked ? <BookmarkCheck size={18} className="text-blue-600" /> : <Bookmark size={18} />}
          </button>
        </summary>
        <div className="space-y-3 border-t border-slate-100 px-4 py-4">
          {q.media && <MediaPlaceholder media={q.media} />}
          {q.answers && (
            <ul className="space-y-1 text-sm">
              {q.answers.map((a) => (
                <li key={a.id} className={a.correct ? 'text-emerald-700' : 'text-slate-500'}>
                  {a.correct ? '✓' : '✗'} {a.text}
                  {a.explanation && <span className="block pl-4 text-xs text-slate-500">{a.explanation}</span>}
                </li>
              ))}
            </ul>
          )}
          {q.numberAnswer && (
            <p className="text-sm text-emerald-700">
              ✓ {q.numberAnswer.prefix} {q.numberAnswer.value.toLocaleString('de-DE')} {q.numberAnswer.unit}
            </p>
          )}
          <Explanation question={q} />
          <p className="font-mono text-xs text-slate-400">{q.officialNumber ?? q.id}</p>
        </div>
      </details>
    </li>
  );
}
