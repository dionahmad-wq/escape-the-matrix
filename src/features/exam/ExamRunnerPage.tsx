import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clock, Flag, LayoutGrid, X } from 'lucide-react';
import { catalog } from '@/data/catalog';
import { emptyAnswer, evaluateAnswer, isAnswered, toggleChoice } from '@/domain/answers';
import { EXAM_CONFIG_B, scoreExam, type ExamRecord } from '@/domain/exam';
import { QuestionView } from '@/components/QuestionView';
import { Button, ConfirmDialog, Kbd, formatDuration } from '@/components/ui';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useAppStore, type ActiveExam } from '@/store/useAppStore';

/** Bewertet die laufende Prüfung, speichert das Ergebnis und gibt die Record-ID zurück. */
function finalizeExam(exam: ActiveExam, timedOut: boolean): string {
  const questions = exam.questionIds.map((id) => catalog.byId.get(id)).filter((q) => q !== undefined);
  const score = scoreExam(questions, exam.answers, EXAM_CONFIG_B);
  const now = Date.now();
  const finishedAt = timedOut && exam.deadline ? Math.min(now, exam.deadline) : now;
  const record: ExamRecord = {
    id: exam.id,
    configId: exam.configId,
    startedAt: exam.startedAt,
    finishedAt,
    durationSec: Math.round((finishedAt - exam.startedAt) / 1000),
    timedOut,
    questionIds: questions.map((q) => q.id),
    answers: exam.answers,
    totalPoints: score.totalPoints,
    errorPoints: score.errorPoints,
    fivePointErrors: score.fivePointErrors,
    correctCount: score.correctCount,
    passed: score.passed,
  };
  // Nur beantwortete Fragen in den Lernstand übernehmen (unbeantwortete zählen in der Prüfung trotzdem als Fehler)
  const correctness: Record<string, boolean> = {};
  for (const q of questions) {
    if (isAnswered(exam.answers[q.id])) correctness[q.id] = evaluateAnswer(q, exam.answers[q.id]).correct;
  }
  useAppStore.getState().completeExam(record, correctness);
  return record.id;
}

/** Ziel nach Abgabe/Abbruch, gesetzt bevor die Prüfung im Store beendet wird (siehe PracticePage). */
let exitTarget: string | null = null;

export function ExamRunnerPage() {
  const exam = useAppStore((s) => s.activeExam);
  if (!exam) return <Navigate to={exitTarget ?? '/pruefung'} replace />;
  exitTarget = null;
  return <ExamRunner key={exam.id} exam={exam} />;
}

function ExamRunner({ exam }: { exam: ActiveExam }) {
  const { setExamAnswer, toggleExamFlag, setExamIndex, abortExam } = useAppStore.getState();
  const questions = useMemo(
    () => exam.questionIds.map((id) => catalog.byId.get(id)).filter((q) => q !== undefined),
    [exam.questionIds],
  );
  const index = Math.min(exam.index, questions.length - 1);
  const q = questions[index]!;
  const answer = exam.answers[q.id] ?? emptyAnswer(q);
  const flagged = exam.flagged.includes(q.id);
  const answeredCount = questions.filter((x) => isAnswered(exam.answers[x.id])).length;

  const [now, setNow] = useState(Date.now());
  const [confirm, setConfirm] = useState<'submit' | 'abort' | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const numberRef = useRef<HTMLInputElement>(null);
  const finished = useRef(false);

  const submit = useCallback(
    (timedOut: boolean) => {
      if (finished.current) return;
      finished.current = true;
      const current = useAppStore.getState().activeExam ?? exam;
      exitTarget = `/pruefung/ergebnis/${current.id}`;
      finalizeExam(current, timedOut);
    },
    [exam],
  );

  // Timer; bei Ablauf automatisch abgeben (auch nach Neuladen der Seite)
  useEffect(() => {
    if (!exam.deadline) return;
    if (Date.now() >= exam.deadline) {
      submit(true);
      return;
    }
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (exam.deadline && n >= exam.deadline) submit(true);
    }, 1000);
    return () => clearInterval(t);
  }, [exam.deadline, submit]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (q.type === 'number') setTimeout(() => numberRef.current?.focus(), 0);
  }, [q.id, q.type]);

  const go = (i: number) => {
    if (i >= 0 && i < questions.length) setExamIndex(i);
  };

  // Tastatur-Handler lesen den aktuellen Stand direkt aus dem Store, damit auch sehr schnelle
  // Eingaben (z. B. gedrückt gehaltene Pfeiltaste) nicht auf einem veralteten Render-Stand arbeiten.
  const live = () => {
    const e = useAppStore.getState().activeExam ?? exam;
    const i = Math.min(e.index, questions.length - 1);
    const cq = questions[i]!;
    return { e, i, cq, ans: e.answers[cq.id] ?? emptyAnswer(cq) };
  };

  useHotkeys(
    {
      ...Object.fromEntries(
        [1, 2, 3, 4, 5].map((n) => [
          String(n),
          () => {
            const { cq, ans } = live();
            if (cq.type === 'number') return numberRef.current?.focus();
            const opt = cq.answers?.[n - 1];
            if (opt) setExamAnswer(cq.id, toggleChoice(ans, opt.id, 'checkbox'));
          },
        ]),
      ),
      Enter: () => {
        const { i } = live();
        if (i < questions.length - 1) go(i + 1);
        else setConfirm('submit');
      },
      ArrowRight: () => go(live().i + 1),
      ArrowLeft: () => go(live().i - 1),
      m: () => toggleExamFlag(live().cq.id),
    },
    { enabled: confirm === null, allowInInputs: ['Enter', 'm'] },
  );

  const remainingSec = exam.deadline ? Math.max(0, (exam.deadline - now) / 1000) : null;
  const elapsedSec = (now - exam.startedAt) / 1000;
  const unanswered = questions.length - answeredCount;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Button variant="ghost" size="sm" onClick={() => setConfirm('abort')} aria-label="Prüfung abbrechen">
            <X size={18} />
          </Button>
          <span className="text-sm font-medium">
            Frage {index + 1} <span className="text-slate-400">/ {questions.length}</span>
          </span>
          <span
            className={`ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium tabular-nums ${
              remainingSec !== null && remainingSec < 300 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'
            }`}
            aria-live={remainingSec !== null && remainingSec < 60 ? 'polite' : 'off'}
            title={remainingSec !== null ? 'Verbleibende Zeit' : 'Verstrichene Zeit'}
          >
            <Clock size={15} />
            {formatDuration(remainingSec ?? elapsedSec)}
          </span>
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setShowGrid((v) => !v)} aria-expanded={showGrid} aria-label="Fragenübersicht">
            <LayoutGrid size={18} />
          </Button>
          <Button size="sm" onClick={() => setConfirm('submit')}>
            Abgeben
          </Button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 gap-6 px-4 py-6 pb-28">
        <main className="min-w-0 flex-1">
          <QuestionView
            ref={numberRef}
            question={q}
            answer={answer}
            onChange={(a) => setExamAnswer(q.id, a)}
            choiceMode="checkbox"
            headerRight={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleExamFlag(q.id)}
                aria-pressed={flagged}
                title="Zum späteren Prüfen markieren (M)"
                className={flagged ? '!text-amber-600' : ''}
              >
                <Flag size={16} fill={flagged ? 'currentColor' : 'none'} /> <span className="hidden sm:inline">{flagged ? 'Markiert' : 'Markieren'}</span>
              </Button>
            }
          />
        </main>

        <aside className={`${showGrid ? 'fixed inset-x-4 top-16 z-20 rounded-xl border border-slate-200 bg-white p-4 shadow-lg' : 'hidden'} lg:static lg:block lg:w-56 lg:shrink-0 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Übersicht</p>
          <ol className="grid grid-cols-6 gap-1.5 lg:grid-cols-5">
            {questions.map((x, i) => {
              const done = isAnswered(exam.answers[x.id]);
              const isFlag = exam.flagged.includes(x.id);
              return (
                <li key={x.id}>
                  <button
                    type="button"
                    onClick={() => {
                      go(i);
                      setShowGrid(false);
                    }}
                    aria-label={`Frage ${i + 1}${done ? ', beantwortet' : ''}${isFlag ? ', markiert' : ''}`}
                    aria-current={i === index}
                    className={`relative flex h-9 w-full items-center justify-center rounded-md border text-xs font-medium tabular-nums ${
                      done ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-600'
                    } ${i === index ? 'ring-2 ring-blue-600 ring-offset-1' : ''}`}
                  >
                    {i + 1}
                    {isFlag && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" />}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-xs text-slate-500">
            {answeredCount} beantwortet · {exam.flagged.length} markiert
          </p>
          <p className="mt-1 text-xs text-slate-400">Grundstoff 1–{questions.filter((x) => x.material === 'grundstoff').length}, danach Zusatzstoff</p>
        </aside>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <Button variant="secondary" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Vorherige Frage (←)">
            <ArrowLeft size={18} />
          </Button>
          <div className="mx-auto hidden items-center gap-3 text-xs text-slate-500 md:flex">
            <span><Kbd>1</Kbd>–<Kbd>5</Kbd> ankreuzen</span>
            <span><Kbd>←</Kbd> <Kbd>→</Kbd> blättern</span>
            <span><Kbd>M</Kbd> markieren</span>
          </div>
          {index < questions.length - 1 ? (
            <Button size="lg" className="ml-auto md:ml-0" onClick={() => go(index + 1)}>
              Weiter <ArrowRight size={18} />
            </Button>
          ) : (
            <Button size="lg" className="ml-auto md:ml-0" onClick={() => setConfirm('submit')}>
              Abgeben
            </Button>
          )}
        </div>
      </footer>

      <ConfirmDialog
        open={confirm === 'submit'}
        title="Prüfung abgeben?"
        confirmLabel="Abgeben"
        onConfirm={() => submit(false)}
        onCancel={() => setConfirm(null)}
      >
        {unanswered > 0 ? (
          <p>
            <strong>{unanswered}</strong> {unanswered === 1 ? 'Frage ist' : 'Fragen sind'} noch unbeantwortet und {unanswered === 1 ? 'zählt' : 'zählen'} als Fehler.
          </p>
        ) : (
          <p>Alle Fragen sind beantwortet.</p>
        )}
        {exam.flagged.length > 0 && <p className="mt-1">{exam.flagged.length} Fragen sind noch markiert.</p>}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === 'abort'}
        title="Prüfung abbrechen?"
        tone="danger"
        confirmLabel="Abbrechen ohne Wertung"
        cancelLabel="Weiter prüfen"
        onConfirm={() => {
          finished.current = true;
          exitTarget = '/pruefung';
          abortExam();
        }}
        onCancel={() => setConfirm(null)}
      >
        Die Prüfung wird verworfen und nicht gewertet.
      </ConfirmDialog>
    </div>
  );
}
