import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { catalog } from '@/data/catalog';
import { emptyAnswer, evaluateAnswer } from '@/domain/answers';
import { CATEGORIES } from '@/domain/categories';
import { EXAM_CONFIG_B, scoreExam } from '@/domain/exam';
import { QuestionView } from '@/components/QuestionView';
import { Badge, Button, Card, ProgressBar, SectionTitle, formatDateTime, formatDuration } from '@/components/ui';
import { usePracticeLauncher } from '@/features/practice/usePracticeLauncher';
import { useAppStore } from '@/store/useAppStore';

export function ExamResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const record = useAppStore((s) => s.examHistory.find((e) => e.id === id));
  const launcher = usePracticeLauncher();
  const [onlyWrong, setOnlyWrong] = useState(true);

  const questions = useMemo(
    () => (record ? record.questionIds.map((qid) => catalog.byId.get(qid)).filter((q) => q !== undefined) : []),
    [record],
  );
  const score = useMemo(() => (record ? scoreExam(questions, record.answers, EXAM_CONFIG_B) : null), [record, questions]);

  if (!record || !score) return <Navigate to="/pruefung" replace />;

  const config = EXAM_CONFIG_B;
  const wrongIds = score.results.filter((r) => !r.correct).map((r) => r.id);
  const shown = onlyWrong ? questions.filter((q) => wrongIds.includes(q.id)) : questions;
  const budgetShare = Math.min(1, record.errorPoints / (config.maxErrorPoints + 1));

  return (
    <div className="space-y-8">
      <Card className={`p-6 ${record.passed ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
        <div className="flex items-start gap-4">
          {record.passed ? <CheckCircle2 className="shrink-0 text-emerald-600" size={40} /> : <XCircle className="shrink-0 text-rose-600" size={40} />}
          <div className="flex-1">
            <h1 className={`text-2xl font-semibold ${record.passed ? 'text-emerald-900' : 'text-rose-900'}`}>
              {record.passed ? 'Bestanden!' : 'Nicht bestanden'}
            </h1>
            <p className="mt-1 text-sm text-slate-700">
              {formatDateTime(record.finishedAt)} · Dauer {formatDuration(record.durationSec)} min{record.timedOut ? ' · Zeit abgelaufen' : ''}
            </p>
            {!record.passed && score.failReasons.length > 0 && (
              <ul className="mt-2 text-sm text-rose-800">
                {score.failReasons.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Fehlerpunkte" value={`${record.errorPoints} / ${config.maxErrorPoints}`} />
          <Metric label="Richtig" value={`${record.correctCount} / ${questions.length}`} />
          <Metric label="5-Punkte-Fehler" value={String(record.fivePointErrors)} />
          <Metric label="Punkte gesamt" value={String(record.totalPoints)} />
        </div>
        <div className="mt-4">
          <ProgressBar value={budgetShare} tone={record.passed ? 'emerald' : 'rose'} label="Fehlerpunkte im Verhältnis zum Limit" />
          <p className="mt-1 text-xs text-slate-600">Fehlerpunkte-Budget: höchstens {config.maxErrorPoints}, zwei 5-Punkte-Fehler führen immer zum Nichtbestehen</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {wrongIds.length > 0 && (
            <Button onClick={() => launcher.start('retry', 'Prüfungsfehler üben', wrongIds)}>
              <RotateCcw size={16} /> {wrongIds.length} Fehler üben
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate('/pruefung')}>
            Neue Simulation
          </Button>
          <Button variant="ghost" onClick={() => navigate('/')}>
            Zur Übersicht
          </Button>
        </div>
      </Card>

      <section>
        <SectionTitle>Auswertung nach Bereich</SectionTitle>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Bereich</th>
                <th className="px-4 py-2 text-right font-medium">Fragen</th>
                <th className="px-4 py-2 text-right font-medium">Falsch</th>
                <th className="px-4 py-2 text-right font-medium">Fehlerpunkte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(['grundstoff', 'zusatzstoff'] as const).map((m) => (
                <tr key={m} className="bg-slate-50/50 font-medium">
                  <td className="px-4 py-2">{m === 'grundstoff' ? 'Grundstoff' : 'Zusatzstoff'}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{score.byMaterial[m].total}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{score.byMaterial[m].wrong}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{score.byMaterial[m].errorPoints}</td>
                </tr>
              ))}
              {Object.entries(score.byCategory)
                .sort((a, b) => b[1].errorPoints - a[1].errorPoints)
                .map(([cat, s]) => (
                  <tr key={cat}>
                    <td className="px-4 py-2">{CATEGORIES[cat as keyof typeof CATEGORIES].label}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{s.total}</td>
                    <td className={`px-4 py-2 text-right tabular-nums ${s.wrong ? 'text-rose-700' : ''}`}>{s.wrong}</td>
                    <td className={`px-4 py-2 text-right tabular-nums ${s.errorPoints ? 'text-rose-700' : ''}`}>{s.errorPoints}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section>
        <SectionTitle
          right={
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} />
              nur falsche
            </label>
          }
        >
          Fragen & Lösungen
        </SectionTitle>
        {shown.length === 0 ? (
          <p className="text-sm text-slate-500">Keine falschen Antworten, stark! 💪</p>
        ) : (
          <ol className="space-y-3">
            {shown.map((q) => {
              const pos = questions.indexOf(q) + 1;
              const correct = evaluateAnswer(q, record.answers[q.id]).correct;
              return (
                <li key={q.id}>
                  <details className="group rounded-xl border border-slate-200 bg-white" open={onlyWrong && shown.length <= 3}>
                    <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3">
                      <span className="w-6 shrink-0 text-sm tabular-nums text-slate-400">{pos}.</span>
                      <span className="flex-1 text-sm">{q.text}</span>
                      <Badge tone={correct ? 'emerald' : 'rose'}>{correct ? '✓' : `−${q.points}`}</Badge>
                    </summary>
                    <div className="border-t border-slate-100 px-4 py-4">
                      <QuestionView
                        question={q}
                        answer={record.answers[q.id] ?? emptyAnswer(q)}
                        choiceMode="checkbox"
                        reveal
                        showExplanation
                        compact
                      />
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/70 px-3 py-2">
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
