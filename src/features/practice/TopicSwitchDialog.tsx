import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { catalog } from '@/data/catalog';
import { CATEGORY_LIST, type CategoryId } from '@/domain/categories';
import { listSubtopics } from '@/domain/subtopics';
import { Button, ProgressBar } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

/**
 * Dialog zum schnellen Themenwechsel – auch mitten in einer Sitzung.
 * Bisherige Antworten sind bereits gespeichert, es geht also nichts verloren.
 */
export function TopicSwitchDialog({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (category: CategoryId, subtopic?: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const progress = useAppStore((s) => s.progress);
  const [expanded, setExpanded] = useState<CategoryId | null>(null);
  const subtopics = useMemo(() => listSubtopics(catalog.questions, progress), [progress]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto max-h-[85dvh] w-[min(36rem,calc(100vw-1.5rem))] rounded-xl p-0 shadow-xl backdrop:bg-slate-900/40"
      aria-labelledby="topic-switch-title"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
        <h2 id="topic-switch-title" className="text-lg font-semibold">Thema wechseln</h2>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Schließen">
          <X size={18} />
        </Button>
      </div>
      <p className="px-5 pt-3 text-sm text-slate-500">Deine bisherigen Antworten sind gespeichert. Nicht gemeisterte Fragen kommen zuerst.</p>
      <ul className="space-y-2 p-4">
        {CATEGORY_LIST.map((c) => {
          const subs = subtopics.filter((s) => s.category === c.id);
          const total = subs.reduce((n, s) => n + s.total, 0);
          if (!total) return null;
          const mastered = subs.reduce((n, s) => n + s.mastered, 0);
          const isOpen = expanded === c.id;
          return (
            <li key={c.id} className="rounded-lg border border-slate-200">
              <div className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => onPick(c.id)}
                  className="flex-1 rounded-l-lg px-3 py-2.5 text-left hover:bg-slate-50"
                >
                  <span className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{c.label}</span>
                    <span className="tabular-nums text-slate-500">
                      {mastered}/{total}
                    </span>
                  </span>
                  <ProgressBar value={total ? mastered / total : 0} tone="emerald" className="mt-1.5 !h-1.5" label={`${c.label} gemeistert`} />
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : c.id)}
                  aria-expanded={isOpen}
                  aria-label={`Unterthemen von ${c.label}`}
                  className="flex items-center gap-1 rounded-r-lg border-l border-slate-200 px-3 text-xs text-slate-600 hover:bg-slate-50"
                >
                  {subs.length} <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {isOpen && (
                <ul className="grid gap-1.5 border-t border-slate-100 p-2 sm:grid-cols-2">
                  {subs.map((s) => (
                    <li key={s.key}>
                      <button
                        type="button"
                        onClick={() => onPick(c.id, s.key)}
                        className="flex w-full items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-left text-sm hover:bg-blue-50"
                      >
                        <span>{s.label}</span>
                        <span className="shrink-0 tabular-nums text-xs text-slate-500">
                          {s.mastered}/{s.total}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </dialog>
  );
}
