import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { catalog } from '@/data/catalog';
import { computeCategoryStats, computeOverall, computeReadiness, computeStreak, lastDays } from '@/domain/stats';
import { Badge, Button, Card, EmptyState, PageTitle, ProgressBar, SectionTitle, formatDateTime, formatPercent } from '@/components/ui';
import { usePracticeLauncher } from '@/features/practice/usePracticeLauncher';
import { useAppStore } from '@/store/useAppStore';

/** Statusfarben (validiert): gemeistert, in Arbeit, falsch, neu (neutral, immer beschriftet). */
const STATUS_SERIES = [
  { key: 'mastered', label: 'Gemeistert', color: '#059669' },
  { key: 'learning', label: 'In Arbeit', color: '#2563eb' },
  { key: 'wrongNow', label: 'Zuletzt falsch', color: '#e11d48' },
  { key: 'new', label: 'Neu', color: '#cbd5e1' },
] as const;

export function StatsPage() {
  const navigate = useNavigate();
  const progress = useAppStore((s) => s.progress);
  const activity = useAppStore((s) => s.activity);
  const exams = useAppStore((s) => s.examHistory);
  const settings = useAppStore((s) => s.settings);
  const launcher = usePracticeLauncher();

  const overall = useMemo(() => computeOverall(catalog.questions, progress, Date.now()), [progress]);
  const cats = useMemo(() => computeCategoryStats(catalog.questions, progress), [progress]);
  const readiness = computeReadiness(overall, exams);
  const streak = computeStreak(activity, settings.dailyGoal);
  const passed = exams.filter((e) => e.passed).length;

  const mostMissed = useMemo(
    () =>
      catalog.questions
        .filter((q) => (progress[q.id]?.wrong ?? 0) > 0)
        .sort((a, b) => progress[b.id]!.wrong - progress[a.id]!.wrong || progress[a.id]!.correct - progress[b.id]!.correct)
        .slice(0, 8),
    [progress],
  );

  const counts = {
    mastered: overall.mastered,
    learning: overall.learning,
    wrongNow: overall.wrongNow,
    new: overall.total - overall.seen,
  };

  return (
    <div className="space-y-8">
      <PageTitle sub="Dein Lernstand auf einen Blick, alles lokal auf diesem Gerät gespeichert.">Statistik</PageTitle>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile label="Prüfungsreife" value={`${readiness.score} %`} hint={readiness.label} />
        <Tile label="Gemeistert" value={`${overall.mastered}/${overall.total}`} hint={formatPercent(overall.masteryShare)} />
        <Tile label="Trefferquote" value={formatPercent(overall.accuracy)} hint={`${overall.answers} Antworten`} />
        <Tile label="Simulationen" value={`${passed}/${exams.length}`} hint="bestanden" />
        <Tile label="Lernserie" value={`${streak} ${streak === 1 ? 'Tag' : 'Tage'}`} hint={`Tagesziel ${settings.dailyGoal} Fragen`} />
      </section>

      <section>
        <SectionTitle>Status aller Fragen</SectionTitle>
        <Card className="p-4">
          <div className="flex h-4 w-full gap-0.5 overflow-hidden rounded" role="img" aria-label={STATUS_SERIES.map((s) => `${s.label}: ${counts[s.key]}`).join(', ')}>
            {STATUS_SERIES.map((s) =>
              counts[s.key] > 0 ? (
                <div
                  key={s.key}
                  title={`${s.label}: ${counts[s.key]} (${formatPercent(counts[s.key] / overall.total)})`}
                  style={{ width: `${(counts[s.key] / overall.total) * 100}%`, backgroundColor: s.color }}
                  className="h-full first:rounded-l last:rounded-r"
                />
              ) : null,
            )}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {STATUS_SERIES.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5 text-slate-700">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden />
                {s.label} <span className="tabular-nums text-slate-500">{counts[s.key]}</span>
              </li>
            ))}
            {overall.unsure > 0 && <li className="text-slate-500">davon {overall.unsure} zuletzt unsicher</li>}
          </ul>
        </Card>
      </section>

      <section>
        <SectionTitle>Aktivität der letzten 14 Tage</SectionTitle>
        <ActivityChart activity={activity} goal={settings.dailyGoal} />
      </section>

      <section>
        <SectionTitle>Nach Themenbereich</SectionTitle>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Thema</th>
                <th className="w-40 px-4 py-2 font-medium">Gemeistert</th>
                <th className="px-4 py-2 text-right font-medium">Bearbeitet</th>
                <th className="px-4 py-2 text-right font-medium">Trefferquote</th>
                <th className="px-4 py-2 text-right font-medium">Falsch</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cats.filter((c) => c.total > 0).map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2.5 font-medium">{c.label}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={c.masteryShare} tone="emerald" label={`${c.label} gemeistert`} />
                      <span className="w-14 shrink-0 text-right tabular-nums text-slate-500">{c.mastered}/{c.total}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{c.seen}/{c.total}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${c.accuracy !== null && c.accuracy < 0.75 ? 'font-medium text-rose-700' : ''}`}>{formatPercent(c.accuracy)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{c.wrongNow}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/training?kategorie=${c.id}`)}>
                      Üben
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <SectionTitle right={mostMissed.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => launcher.start('retry', 'Häufigste Fehler', mostMissed.map((q) => q.id))}>Üben</Button>
          )}>Häufigste Fehler</SectionTitle>
          {mostMissed.length === 0 ? (
            <EmptyState title="Noch keine Fehler" />
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {mostMissed.map((q) => (
                <li key={q.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                  <Badge tone="rose" className="shrink-0">{progress[q.id]!.wrong}✗</Badge>
                  <span className="line-clamp-2 flex-1">{q.text}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle right={<Link to="/pruefung" className="text-sm text-blue-700 hover:underline">Zur Simulation</Link>}>Prüfungssimulationen</SectionTitle>
          {exams.length === 0 ? (
            <EmptyState title="Noch keine Simulation" />
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {exams.slice(0, 8).map((e) => (
                <li key={e.id}>
                  <Link to={`/pruefung/ergebnis/${e.id}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50">
                    {e.passed ? <CheckCircle2 size={18} className="text-emerald-600" /> : <XCircle size={18} className="text-rose-600" />}
                    <span className="flex-1">{formatDateTime(e.finishedAt)}</span>
                    <span className="tabular-nums text-slate-600">{e.errorPoints} FP</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </Card>
  );
}

/** Balkendiagramm (eine Reihe) mit Tagesziel-Linie, Hover-Tooltip und Tabellenansicht. */
function ActivityChart({ activity, goal }: { activity: Parameters<typeof lastDays>[0]; goal: number }) {
  const days = lastDays(activity, 14);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(goal, ...days.map((d) => d.answered), 1);
  const scaleMax = Math.ceil((max * 1.1) / 5) * 5;
  const goalPct = (goal / scaleMax) * 100;
  const fmt = (d: Date) => d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });

  return (
    <Card className="p-4">
      <div className="relative h-40" onMouseLeave={() => setHover(null)}>
        {/* Ziel-Linie (gestrichelt, zurückhaltend) */}
        <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-slate-400" style={{ bottom: `${goalPct}%` }}>
          <span className="absolute -top-4 right-0 bg-white pl-1 text-[11px] text-slate-500">Ziel {goal}</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 border-t border-slate-200" />
        <div className="relative flex h-full items-end gap-1 sm:gap-1.5">
          {days.map((d, i) => (
            <div
              key={d.key}
              className="flex h-full flex-1 cursor-default items-end justify-center"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              tabIndex={0}
              aria-label={`${fmt(d.date)}: ${d.answered} Fragen, ${d.correct} richtig`}
            >
              <div
                className={`w-full max-w-7 rounded-t-[4px] ${d.answered >= goal ? 'bg-emerald-600' : 'bg-blue-600'} ${hover === i ? 'opacity-80' : ''}`}
                style={{ height: d.answered ? `${(d.answered / scaleMax) * 100}%` : 0 }}
              />
            </div>
          ))}
        </div>
        {hover !== null && days[hover] && (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow"
            style={{ left: `${((hover + 0.5) / days.length) * 100}%` }}
          >
            <div className="font-medium">{fmt(days[hover].date)}</div>
            <div>{days[hover].answered} Fragen · {days[hover].correct} richtig</div>
          </div>
        )}
      </div>
      <div className="mt-1.5 flex gap-1 text-[10px] text-slate-500 sm:gap-1.5">
        {days.map((d, i) => (
          <span key={d.key} className="flex-1 text-center">
            {i % 2 === 1 || days.length <= 7 ? d.date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : ''}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-blue-600" /> Fragen beantwortet</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" /> Tagesziel erreicht</span>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-slate-500">Als Tabelle anzeigen</summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead className="text-slate-500">
            <tr><th className="py-1">Tag</th><th className="py-1 text-right">Beantwortet</th><th className="py-1 text-right">Richtig</th></tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.key} className="border-t border-slate-100">
                <td className="py-1">{fmt(d.date)}</td>
                <td className="py-1 text-right tabular-nums">{d.answered}</td>
                <td className="py-1 text-right tabular-nums">{d.correct}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Card>
  );
}
