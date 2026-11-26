import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bookmark, PlayCircle, RefreshCcw, Target, Zap } from 'lucide-react';
import { catalog } from '@/data/catalog';
import { CATEGORY_LIST, type CategoryId } from '@/domain/categories';
import { filterQuestions, orderQuestions, type Ordering, type StatusFilter } from '@/domain/selection';
import { computeCategoryStats, computeOverall } from '@/domain/stats';
import type { Material } from '@/domain/types';
import { Button, Card, PageTitle, ProgressBar, SectionTitle } from '@/components/ui';
import { usePracticeLauncher } from '@/features/practice/usePracticeLauncher';
import { useAppStore } from '@/store/useAppStore';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'unmastered', label: 'Nicht gemeistert' },
  { value: 'new', label: 'Neue' },
  { value: 'wrong', label: 'Zuletzt falsch' },
  { value: 'bookmarked', label: 'Lesezeichen' },
  { value: 'mastered', label: 'Gemeistert' },
];

const COUNT_OPTIONS = [10, 20, 30, 0] as const;

export function TrainingPage() {
  const [params] = useSearchParams();
  const initialCat = params.get('kategorie') as CategoryId | null;
  const progress = useAppStore((s) => s.progress);
  const bookmarks = useAppStore((s) => s.bookmarks);
  const settings = useAppStore((s) => s.settings);
  const launcher = usePracticeLauncher();

  const [categories, setCategories] = useState<CategoryId[]>(initialCat && CATEGORY_LIST.some((c) => c.id === initialCat) ? [initialCat] : []);
  const [material, setMaterial] = useState<Material | 'all'>('all');
  const [status, setStatus] = useState<StatusFilter>('unmastered');
  const [ordering, setOrdering] = useState<Ordering>('unmastered-first');
  const [count, setCount] = useState<number>(20);

  const cats = useMemo(() => computeCategoryStats(catalog.questions, progress), [progress]);
  const overall = useMemo(() => computeOverall(catalog.questions, progress, Date.now()), [progress]);
  const matching = useMemo(
    () => filterQuestions(catalog.questions, { categories, material, status }, progress, bookmarks),
    [categories, material, status, progress, bookmarks],
  );

  const toggleCat = (id: CategoryId) =>
    setCategories((cs) => (cs.includes(id) ? cs.filter((c) => c !== id) : [...cs, id]));

  const start = () => {
    const ordered = orderQuestions(matching, ordering, progress);
    const picked = count ? ordered.slice(0, count) : ordered;
    const title =
      categories.length === 1 ? `Thema: ${CATEGORY_LIST.find((c) => c.id === categories[0])!.label}` : categories.length ? `${categories.length} Themen` : 'Themen-Training';
    launcher.start('topic', title, picked.map((q) => q.id));
  };

  return (
    <div className="space-y-8">
      <PageTitle sub="Wähle einen Modus oder stelle dir dein eigenes Training zusammen.">Lernen</PageTitle>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickMode icon={<Zap size={18} />} title="Schnelle Runde" text={`${settings.quickRoundSize} Fragen, intelligent gemischt`} onClick={() => launcher.quick()} />
        <QuickMode icon={<Target size={18} />} title="Schwächen" text={`${overall.weak} falsch/unsicher`} onClick={() => launcher.weakness()} disabled={!overall.weak} />
        <QuickMode icon={<RefreshCcw size={18} />} title="Wiederholung" text={`${overall.due} fällig`} onClick={() => launcher.review()} disabled={!overall.due} />
        <QuickMode icon={<Bookmark size={18} />} title="Lesezeichen" text={`${Object.keys(bookmarks).length} markiert`} onClick={() => launcher.bookmarks()} disabled={!Object.keys(bookmarks).length} />
      </section>

      <section>
        <SectionTitle>Themen-Training</SectionTitle>
        <Card className="space-y-6 p-4 sm:p-6">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Themen {categories.length === 0 && <span className="font-normal text-slate-500">(alle)</span>}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {cats.map((c) => {
                const active = categories.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="checkbox"
                    aria-checked={active}
                    onClick={() => toggleCat(c.id)}
                    disabled={c.total === 0}
                    className={`rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-40 ${active ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 hover:border-slate-400'}`}
                  >
                    <span className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium">{c.label}</span>
                      <span className="tabular-nums text-slate-500">
                        {c.mastered}/{c.total}
                      </span>
                    </span>
                    <ProgressBar value={c.masteryShare} tone="emerald" className="mt-2 !h-1.5" label={`${c.label} gemeistert`} />
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Segmented
              label="Stoff"
              value={material}
              onChange={setMaterial}
              options={[
                { value: 'all', label: 'Alle' },
                { value: 'grundstoff', label: 'Grundstoff' },
                { value: 'zusatzstoff', label: 'Zusatzstoff' },
              ]}
            />
            <Segmented
              label="Anzahl"
              value={count}
              onChange={setCount}
              options={COUNT_OPTIONS.map((n) => ({ value: n, label: n === 0 ? 'Alle' : String(n) }))}
            />
            <label className="text-sm">
              <span className="mb-1.5 block font-medium">Fragen</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1.5 block font-medium">Reihenfolge</span>
              <select value={ordering} onChange={(e) => setOrdering(e.target.value as Ordering)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                <option value="unmastered-first">Schwächen & Neue zuerst</option>
                <option value="random">Zufällig</option>
                <option value="catalog">Katalogreihenfolge</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-600">
              <strong className="tabular-nums">{matching.length}</strong> passende Fragen
              {count > 0 && matching.length > count && <>, davon {count} im Training</>}
            </p>
            <Button size="lg" onClick={start} disabled={matching.length === 0}>
              <PlayCircle size={20} /> Training starten
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}

function QuickMode({ icon, title, text, onClick, disabled }: { icon: React.ReactNode; title: string; text: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200"
    >
      <span className="text-blue-600">{icon}</span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-slate-500">{text}</span>
      </span>
    </button>
  );
}

function Segmented<T extends string | number>({
  label, value, onChange, options,
}: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="text-sm">
      <span className="mb-1.5 block font-medium" id={`seg-${label}`}>{label}</span>
      <div role="radiogroup" aria-labelledby={`seg-${label}`} className="flex rounded-lg border border-slate-300 bg-slate-50 p-0.5">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-md px-2 py-1.5 ${value === o.value ? 'bg-white font-medium shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
