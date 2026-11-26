import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bookmark, ClipboardCheck, Flame, Layers, PlayCircle, Target, Zap } from 'lucide-react';
import { catalog } from '@/data/catalog';
import { buildRecommendations, computeCategoryStats, computeOverall, computeReadiness, computeStreak, dayKey } from '@/domain/stats';
import { Card, ProgressBar, SectionTitle, formatPercent } from '@/components/ui';
import { usePracticeLauncher } from '@/features/practice/usePracticeLauncher';
import { useAppStore } from '@/store/useAppStore';
import { RecommendationList } from './RecommendationList';

export function DashboardPage() {
  const navigate = useNavigate();
  const progress = useAppStore((s) => s.progress);
  const activity = useAppStore((s) => s.activity);
  const exams = useAppStore((s) => s.examHistory);
  const settings = useAppStore((s) => s.settings);
  const practice = useAppStore((s) => s.practice);
  const activeExam = useAppStore((s) => s.activeExam);
  const bookmarkCount = useAppStore((s) => Object.keys(s.bookmarks).length);
  const launcher = usePracticeLauncher();

  const now = Date.now();
  const overall = useMemo(() => computeOverall(catalog.questions, progress, now), [progress]); // eslint-disable-line react-hooks/exhaustive-deps
  const cats = useMemo(() => computeCategoryStats(catalog.questions, progress), [progress]);
  const readiness = computeReadiness(overall, exams);
  const recs = useMemo(() => buildRecommendations(catalog.questions, progress, exams, now), [progress, exams]); // eslint-disable-line react-hooks/exhaustive-deps
  const today = activity[dayKey(now)] ?? { answered: 0, correct: 0 };
  const streak = computeStreak(activity, settings.dailyGoal);
  const goalShare = today.answered / settings.dailyGoal;

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Führerschein Klasse B</h1>
          <p className="mt-1 text-slate-600">
            {overall.seen === 0 ? 'Bereit für die erste Lerneinheit?' : `${overall.mastered} von ${overall.total} Fragen gemeistert. Weiter so!`}
          </p>
        </div>
      </section>

      {(activeExam || (practice && !practice.finishedAt)) && (
        <div className="space-y-2">
          {activeExam && (
            <ResumeBanner
              title="Prüfungssimulation läuft"
              text={`${Object.keys(activeExam.answers).length} von ${activeExam.questionIds.length} beantwortet`}
              onClick={() => navigate('/pruefung/laufend')}
            />
          )}
          {practice && !practice.finishedAt && (
            <ResumeBanner
              title={`Weiterlernen: ${practice.title}`}
              text={`${Object.keys(practice.answers).length} von ${practice.questionIds.length} Fragen bearbeitet`}
              onClick={() => navigate('/lernen')}
            />
          )}
        </div>
      )}

      {/* Tagesziel & Kennzahlen */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm text-slate-500">
              <Target size={16} /> Tagesziel
            </span>
            {streak > 0 && (
              <span className="flex items-center gap-1 text-sm font-medium text-orange-600" title="Tage in Folge mit erreichtem Tagesziel">
                <Flame size={16} /> {streak} {streak === 1 ? 'Tag' : 'Tage'}
              </span>
            )}
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">
            {today.answered} <span className="text-base font-normal text-slate-400">/ {settings.dailyGoal}</span>
          </div>
          <ProgressBar value={goalShare} tone={goalShare >= 1 ? 'emerald' : 'blue'} className="mt-2" label="Tagesziel" />
          <p className="mt-1.5 text-xs text-slate-500">{goalShare >= 1 ? 'Tagesziel erreicht ✓' : `Noch ${settings.dailyGoal - today.answered} Fragen heute`}</p>
        </Card>
        <Card className="p-4">
          <span className="text-sm text-slate-500">Gemeistert</span>
          <div className="mt-2 text-2xl font-semibold tabular-nums">
            {formatPercent(overall.masteryShare)} <span className="text-base font-normal text-slate-400">· {overall.mastered}/{overall.total}</span>
          </div>
          <ProgressBar value={overall.masteryShare} tone="emerald" className="mt-2" label="Gemeisterte Fragen" />
          <p className="mt-1.5 text-xs text-slate-500">Trefferquote insgesamt: {formatPercent(overall.accuracy)}</p>
        </Card>
        <Card className="p-4">
          <span className="text-sm text-slate-500">Prüfungsreife</span>
          <div className="mt-2 text-2xl font-semibold tabular-nums">
            {readiness.score} % <span className="text-base font-normal text-slate-500">{readiness.label}</span>
          </div>
          <ProgressBar value={readiness.score / 100} tone={readiness.ready ? 'emerald' : 'amber'} className="mt-2" label="Prüfungsreife" />
          <p className="mt-1.5 text-xs text-slate-500">
            {readiness.recentPassRate === null ? 'Noch keine Simulation' : `Letzte Simulationen: ${formatPercent(readiness.recentPassRate)} bestanden`}
          </p>
        </Card>
      </section>

      {/* Lernmodi */}
      <section>
        <SectionTitle>Lernen</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ModeCard icon={<Zap size={22} />} title="Schnelle Runde" text={`${settings.quickRoundSize} gemischte Fragen für zwischendurch`} onClick={() => launcher.quick()} accent="bg-blue-600" />
          <ModeCard icon={<Layers size={22} />} title="Themen-Training" text="Gezielt nach Kategorie & Stoff üben" onClick={() => navigate('/training')} accent="bg-violet-600" />
          <ModeCard
            icon={<Target size={22} />}
            title="Schwächen-Training"
            text={overall.weak ? `${overall.weak} Fragen falsch oder unsicher` : 'Noch keine Schwächen erkannt'}
            onClick={() => launcher.weakness()}
            disabled={overall.weak === 0}
            accent="bg-rose-600"
          />
          <ModeCard icon={<ClipboardCheck size={22} />} title="Prüfungssimulation" text="30 Fragen, Zeitlimit, Fehlerpunkte" onClick={() => navigate('/pruefung')} accent="bg-emerald-600" />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <Link to="/lesezeichen" className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900">
            <Bookmark size={15} /> Lesezeichen ({bookmarkCount})
          </Link>
          {overall.due > 0 && (
            <button type="button" onClick={() => launcher.review()} className="text-slate-600 hover:text-slate-900">
              ↻ {overall.due} Wiederholungen fällig
            </button>
          )}
        </div>
      </section>

      {recs.length > 0 && (
        <section>
          <SectionTitle>Empfehlungen für dich</SectionTitle>
          <RecommendationList items={recs} />
        </section>
      )}

      <section>
        <SectionTitle right={<Link to="/statistik" className="text-sm text-blue-700 hover:underline">Alle Statistiken</Link>}>Fortschritt nach Thema</SectionTitle>
        <Card className="divide-y divide-slate-100">
          {cats.filter((c) => c.total > 0).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => navigate(`/training?kategorie=${c.id}`)}
              className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-slate-50"
            >
              <span className="w-40 shrink-0 truncate text-sm font-medium sm:w-56">{c.label}</span>
              <ProgressBar value={c.masteryShare} tone="emerald" className="flex-1" label={`${c.label} gemeistert`} />
              <span className="w-16 shrink-0 text-right text-sm tabular-nums text-slate-500">
                {c.mastered}/{c.total}
              </span>
            </button>
          ))}
        </Card>
      </section>
    </div>
  );
}

function ModeCard({
  icon, title, text, onClick, disabled, accent,
}: { icon: React.ReactNode; title: string; text: string; onClick: () => void; disabled?: boolean; accent: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex flex-col items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-400 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-slate-200 disabled:hover:shadow-none"
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-lg text-white ${accent}`}>{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-slate-500">{text}</span>
      </span>
    </button>
  );
}

function ResumeBanner({ title, text, onClick }: { title: string; text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-left hover:bg-blue-100"
    >
      <PlayCircle className="shrink-0 text-blue-600" size={22} />
      <span className="flex-1">
        <span className="block font-medium text-blue-900">{title}</span>
        <span className="block text-sm text-blue-800">{text}</span>
      </span>
      <span className="text-sm font-medium text-blue-700">Fortsetzen →</span>
    </button>
  );
}
