import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { catalog } from '@/data/catalog';
import { CATEGORIES, CATEGORY_LIST } from '@/domain/categories';
import type { CategoryId, Material, Question } from '@/domain/types';
import { MediaPlaceholder } from '@/components/MediaPlaceholder';

const TYPE_LABEL: Record<Question['type'], string> = {
  single: 'Eine Antwort',
  multiple: 'Mehrfachauswahl',
  number: 'Zahlenfrage',
};

/** Vorläufiger Katalog-Browser zum Prüfen der Daten (Meilenstein 1). */
export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const category = params.get('kategorie') as CategoryId | null;
  const material = params.get('stoff') as Material | null;

  const questions = useMemo(
    () =>
      catalog.questions.filter(
        (q) => (!category || q.category === category) && (!material || q.material === material),
      ),
    [category, material],
  );

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="text-2xl font-semibold tracking-tight mr-auto">Katalog</h1>
        <select
          aria-label="Kategorie"
          value={category ?? ''}
          onChange={(e) => update('kategorie', e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">Alle Kategorien</option>
          {CATEGORY_LIST.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Stoff"
          value={material ?? ''}
          onChange={(e) => update('stoff', e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">Grund- & Zusatzstoff</option>
          <option value="grundstoff">Grundstoff</option>
          <option value="zusatzstoff">Zusatzstoff</option>
        </select>
      </div>

      <p className="text-sm text-slate-500">{questions.length} Fragen</p>

      <ul className="space-y-4">
        {questions.map((q) => (
          <li key={q.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap gap-1.5 text-xs">
              <Badge>{CATEGORIES[q.category].label}</Badge>
              <Badge>{q.material === 'grundstoff' ? 'Grundstoff' : 'Zusatzstoff'}</Badge>
              <Badge>{TYPE_LABEL[q.type]}</Badge>
              <Badge tone="blue">{q.points} Punkte</Badge>
              <span className="ml-auto font-mono text-slate-400">{q.officialNumber ?? q.id}</span>
            </div>
            <p className="font-medium">{q.text}</p>
            {q.media && <MediaPlaceholder media={q.media} />}
            {q.answers && (
              <ul className="space-y-1 text-sm">
                {q.answers.map((a) => (
                  <li key={a.id} className={a.correct ? 'text-emerald-700' : 'text-slate-600'}>
                    {a.correct ? '✓' : '✗'} {a.text}
                  </li>
                ))}
              </ul>
            )}
            {q.numberAnswer && (
              <p className="text-sm text-emerald-700">
                ✓ {q.numberAnswer.prefix} {q.numberAnswer.value.toLocaleString('de-DE')} {q.numberAnswer.unit}
              </p>
            )}
            <p className="text-sm text-slate-600">{q.explanation}</p>
            {q.mnemonic && <p className="text-sm italic text-slate-500">💡 {q.mnemonic}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Badge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'blue' }) {
  const cls = tone === 'blue' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600';
  return <span className={`rounded px-1.5 py-0.5 ${cls}`}>{children}</span>;
}
