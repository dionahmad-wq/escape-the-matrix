import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PlayCircle, Search } from 'lucide-react';
import { catalog } from '@/data/catalog';
import { CATEGORY_LIST, type CategoryId } from '@/domain/categories';
import { filterQuestions, type StatusFilter } from '@/domain/selection';
import { listSubtopics } from '@/domain/subtopics';
import type { Material } from '@/domain/types';
import { QuestionListItem } from '@/components/QuestionListItem';
import { Button, EmptyState, PageTitle } from '@/components/ui';
import { usePracticeLauncher } from '@/features/practice/usePracticeLauncher';
import { useAppStore } from '@/store/useAppStore';

const PAGE = 50;

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const category = params.get('kategorie') as CategoryId | null;
  const material = (params.get('stoff') as Material | null) ?? 'all';
  const status = (params.get('status') as StatusFilter | null) ?? 'all';
  const subtopic = params.get('unterthema');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const progress = useAppStore((s) => s.progress);
  const bookmarks = useAppStore((s) => s.bookmarks);
  const launcher = usePracticeLauncher();

  const questions = useMemo(
    () =>
      filterQuestions(
        catalog.questions,
        { categories: category ? [category] : [], subtopics: subtopic ? [subtopic] : [], material, status, search },
        progress,
        bookmarks,
      ),
    [category, subtopic, material, status, search, progress, bookmarks],
  );
  const subtopicOptions = useMemo(() => (category ? listSubtopics(catalog.questions, {}, [category]) : []), [category]);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value && value !== 'all') next.set(key, value);
    else next.delete(key);
    if (key === 'kategorie') next.delete('unterthema'); // Unterthema gehört zur Kategorie
    setParams(next, { replace: true });
    setLimit(PAGE);
  };

  const select = 'rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm';

  return (
    <div className="space-y-5">
      <PageTitle sub={`${catalog.questions.length} Fragen aus ${catalog.files.length} Katalogdateien`}>Fragenkatalog</PageTitle>

      <div className="flex flex-wrap gap-2">
        <label className="relative min-w-48 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setLimit(PAGE);
            }}
            placeholder="Suchen (Text, Nummer …)"
            aria-label="Fragen durchsuchen"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm"
          />
        </label>
        <select aria-label="Kategorie" value={category ?? ''} onChange={(e) => update('kategorie', e.target.value)} className={select}>
          <option value="">Alle Kategorien</option>
          {CATEGORY_LIST.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        {subtopicOptions.length > 0 && (
          <select aria-label="Unterthema" value={subtopic ?? ''} onChange={(e) => update('unterthema', e.target.value)} className={select}>
            <option value="">Alle Unterthemen</option>
            {subtopicOptions.map((st) => (
              <option key={st.key} value={st.key}>
                {st.label} ({st.total})
              </option>
            ))}
          </select>
        )}
        <select aria-label="Stoff" value={material} onChange={(e) => update('stoff', e.target.value)} className={select}>
          <option value="all">Grund- & Zusatzstoff</option>
          <option value="grundstoff">Grundstoff</option>
          <option value="zusatzstoff">Zusatzstoff</option>
        </select>
        <select aria-label="Status" value={status} onChange={(e) => update('status', e.target.value)} className={select}>
          <option value="all">Jeder Status</option>
          <option value="new">Neu</option>
          <option value="unmastered">Nicht gemeistert</option>
          <option value="wrong">Zuletzt falsch</option>
          <option value="mastered">Gemeistert</option>
          <option value="bookmarked">Lesezeichen</option>
        </select>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{questions.length} Fragen</p>
        <Button variant="secondary" size="sm" disabled={!questions.length} onClick={() => launcher.start('custom', 'Katalogauswahl', questions.map((q) => q.id))}>
          <PlayCircle size={16} /> Auswahl üben
        </Button>
      </div>

      {questions.length === 0 ? (
        <EmptyState title="Keine Fragen gefunden">Passe Suche oder Filter an.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {questions.slice(0, limit).map((q) => (
            <QuestionListItem key={q.id} question={q} progress={progress[q.id]} />
          ))}
        </ul>
      )}
      {questions.length > limit && (
        <div className="text-center">
          <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>
            Weitere {Math.min(PAGE, questions.length - limit)} anzeigen
          </Button>
        </div>
      )}
      {catalog.issues.length > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Beim Laden des Katalogs gab es {catalog.issues.length} Hinweise. Details mit <code>npm run validate</code>.
        </p>
      )}
    </div>
  );
}
