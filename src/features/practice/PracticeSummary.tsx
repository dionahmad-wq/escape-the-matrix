import { useMemo } from 'react';
import { RotateCcw, Trophy, Zap } from 'lucide-react';
import { catalog } from '@/data/catalog';
import { buildRecommendations } from '@/domain/stats';
import { Explanation } from '@/components/QuestionView';
import { Badge, Button, Card, ProgressBar } from '@/components/ui';
import { useAppStore, type PracticeSession } from '@/store/useAppStore';
import { RecommendationList } from '@/features/dashboard/RecommendationList';
import { endPractice } from './PracticePage';
import { usePracticeLauncher } from './usePracticeLauncher';

export function PracticeSummary({ session }: { session: PracticeSession }) {
  const progress = useAppStore((s) => s.progress);
  const examHistory = useAppStore((s) => s.examHistory);
  const launcher = usePracticeLauncher();

  const entries = Object.entries(session.answers);
  const correct = entries.filter(([, a]) => a.correct).length;
  const unsure = entries.filter(([, a]) => a.unsure).length;
  const wrongIds = entries.filter(([, a]) => !a.correct).map(([id]) => id);
  const newlyMastered = entries.filter(([id]) => {
    const p = progress[id];
    return p?.mastered && (p.masteredAt ?? 0) >= session.startedAt;
  }).length;
  const share = entries.length ? correct / entries.length : 0;

  const recs = useMemo(() => buildRecommendations(catalog.questions, progress, examHistory, Date.now()).slice(0, 2), [progress, examHistory]);

  const done = () => endPractice('/');

  const headline =
    share === 1 ? 'Perfekt, alles richtig!' : share >= 0.8 ? 'Sehr gut!' : share >= 0.5 ? 'Solide, da geht noch was.' : 'Dranbleiben, Übung macht den Meister.';

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Card className="p-6 text-center">
        <Trophy className="mx-auto text-amber-500" size={36} aria-hidden />
        <h1 className="mt-2 text-2xl font-semibold">{headline}</h1>
        <p className="mt-1 text-slate-600">{session.title}</p>
        <div className="mx-auto mt-5 grid max-w-md grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-3xl font-semibold tabular-nums">
              {correct}/{entries.length}
            </div>
            <div className="text-xs text-slate-500">richtig</div>
          </div>
          <div>
            <div className="text-3xl font-semibold tabular-nums text-emerald-600">{newlyMastered}</div>
            <div className="text-xs text-slate-500">neu gemeistert</div>
          </div>
          <div>
            <div className="text-3xl font-semibold tabular-nums text-amber-600">{unsure}</div>
            <div className="text-xs text-slate-500">unsicher</div>
          </div>
        </div>
        <ProgressBar value={share} tone={share >= 0.8 ? 'emerald' : share >= 0.5 ? 'amber' : 'rose'} className="mx-auto mt-5 max-w-md" />
        {entries.length < session.questionIds.length && (
          <p className="mt-3 text-sm text-slate-500">
            Vorzeitig beendet: {entries.length} von {session.questionIds.length} Fragen bearbeitet.
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {wrongIds.length > 0 && (
            <Button onClick={() => launcher.start('retry', 'Fehler wiederholen', wrongIds)}>
              <RotateCcw size={16} /> {wrongIds.length} Fehler wiederholen
            </Button>
          )}
          <Button variant="secondary" onClick={() => launcher.quick()}>
            <Zap size={16} /> Neue schnelle Runde
          </Button>
          <Button variant="ghost" onClick={done}>
            Zur Übersicht
          </Button>
        </div>
      </Card>

      {recs.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Empfehlung</h2>
          <RecommendationList items={recs} />
        </section>
      )}

      {wrongIds.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Falsch beantwortet</h2>
          <ul className="space-y-2">
            {wrongIds.map((id) => {
              const q = catalog.byId.get(id);
              if (!q) return null;
              return (
                <li key={id}>
                  <details className="group rounded-lg border border-slate-200 bg-white">
                    <summary className="flex cursor-pointer list-none items-start gap-2 px-4 py-3">
                      <Badge tone="rose">✗</Badge>
                      <span className="flex-1 text-sm">{q.text}</span>
                      <span className="text-xs text-slate-400 group-open:hidden">Lösung</span>
                    </summary>
                    <div className="space-y-2 px-4 pb-4">
                      {q.answers && (
                        <ul className="text-sm">
                          {q.answers.map((a) => (
                            <li key={a.id} className={a.correct ? 'text-emerald-700' : 'text-slate-500'}>
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
                      <Explanation question={q} />
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
