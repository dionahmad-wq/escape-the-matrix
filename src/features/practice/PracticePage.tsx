import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, CircleHelp, X } from 'lucide-react';
import { catalog } from '@/data/catalog';
import { describeMistake, emptyAnswer, evaluateAnswer, isAnswered, type UserAnswer } from '@/domain/answers';
import { MASTERY_STREAK, remainingForMastery } from '@/domain/progress';
import { QuestionView } from '@/components/QuestionView';
import { Button, Kbd, ProgressBar } from '@/components/ui';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useAppStore } from '@/store/useAppStore';
import { PracticeSummary } from './PracticeSummary';

/**
 * Ziel nach dem Beenden einer Sitzung. Wird gesetzt, BEVOR die Sitzung im Store gelöscht wird,
 * damit die automatische Umleitung (keine Sitzung → Navigate) zum gewünschten Ziel führt.
 */
let exitTarget: string | null = null;
export function endPractice(to: string) {
  exitTarget = to;
  useAppStore.getState().clearPractice();
}
export function resetPracticeExitTarget() {
  exitTarget = null;
}

export function PracticePage() {
  const practice = useAppStore((s) => s.practice);
  if (!practice) return <Navigate to={exitTarget ?? '/training'} replace />;
  if (practice.finishedAt) return <PracticeSummary session={practice} />;
  if (!practice.questionIds.some((id) => catalog.byId.has(id))) return <InvalidSession />;
  return <PracticeRunner key={practice.id} />;
}

function InvalidSession() {
  return (
    <div className="p-6 text-center">
      <p>Diese Sitzung enthält keine gültigen Fragen mehr (Katalog wurde geändert).</p>
      <Button className="mt-4" onClick={() => endPractice('/training')}>
        Zum Training
      </Button>
    </div>
  );
}

function PracticeRunner() {
  const practice = useAppStore((s) => s.practice)!;
  const progress = useAppStore((s) => s.progress);
  const bookmarks = useAppStore((s) => s.bookmarks);
  const settings = useAppStore((s) => s.settings);
  const { answerPractice, setPracticeIndex, finishPractice, toggleBookmark } = useAppStore.getState();

  // Fragen, die es im Katalog nicht mehr gibt, überspringen
  const questions = useMemo(
    () => practice.questionIds.map((id) => catalog.byId.get(id)).filter((q) => q !== undefined),
    [practice.questionIds],
  );
  const index = Math.min(practice.index, questions.length - 1);
  const q = questions[index]!;

  const stored = practice.answers[q.id];
  // Lokaler Zustand ist an die Fragen-ID gebunden → bei Fragewechsel automatisch „leer“,
  // ohne nachträglichen Reset (der schnelle Eingaben verschlucken könnte).
  const [draftState, setDraftState] = useState<{ id: string; answer: UserAnswer } | null>(null);
  const [unsureId, setUnsureId] = useState<string | null>(null);
  const [justAnsweredId, setJustAnsweredId] = useState<string | null>(null);
  const draft = draftState?.id === q.id ? draftState.answer : null;
  const setDraft = (answer: UserAnswer) => setDraftState({ id: q.id, answer });
  const unsure = unsureId === q.id;
  const setUnsure = (fn: (u: boolean) => boolean) => setUnsureId(fn(unsure) ? q.id : null);
  const justAnswered = justAnsweredId === q.id;
  const [showExplanation, setShowExplanation] = useState(settings.autoShowExplanation);
  const numberRef = useRef<HTMLInputElement>(null);

  // Bei Fragewechsel: Erklärung-Voreinstellung, Fokus und Scrollposition
  useEffect(() => {
    setShowExplanation(settings.autoShowExplanation);
    if (q.type === 'number' && !practice.answers[q.id]) setTimeout(() => numberRef.current?.focus(), 0);
    window.scrollTo({ top: 0 });
  }, [q.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Automatisch weiter nach richtiger Antwort (optional)
  useEffect(() => {
    if (!justAnswered || !stored?.correct || !settings.autoAdvanceOnCorrect) return;
    const t = setTimeout(() => next(), 1200);
    return () => clearTimeout(t);
  }, [justAnswered]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = stored?.answer ?? draft ?? emptyAnswer(q);
  const checked = !!stored;
  const answeredCount = Object.keys(practice.answers).length;
  const correctCount = Object.values(practice.answers).filter((a) => a.correct).length;
  const choiceMode = q.type === 'single' ? 'radio' : 'checkbox';
  const isLast = index >= questions.length - 1;

  function check() {
    if (checked || !isAnswered(answer)) return;
    const ev = evaluateAnswer(q, answer);
    answerPractice(q.id, answer, ev.correct, unsure);
    setJustAnsweredId(q.id);
  }

  function next() {
    if (isLast) finishPractice();
    else setPracticeIndex(index + 1);
  }

  function prev() {
    if (index > 0) setPracticeIndex(index - 1);
  }

  function exit() {
    if (answeredCount > 0) finishPractice();
    else endPractice('/');
  }

  useHotkeys({
    ...Object.fromEntries(
      [1, 2, 3, 4, 5].map((n) => [
        String(n),
        () => {
          if (checked) return;
          if (q.type === 'number') return numberRef.current?.focus();
          const opt = q.answers?.[n - 1];
          if (opt) {
            const base = draft ?? emptyAnswer(q);
            setDraft(
              choiceMode === 'radio'
                ? { kind: 'choice', selected: [opt.id] }
                : { kind: 'choice', selected: base.kind === 'choice' && base.selected.includes(opt.id) ? base.selected.filter((x) => x !== opt.id) : [...(base.kind === 'choice' ? base.selected : []), opt.id] },
            );
          }
        },
      ]),
    ),
    Enter: () => (checked ? next() : check()),
    ArrowRight: () => {
      if (checked || index < answeredCount) next();
    },
    ArrowLeft: prev,
    b: () => toggleBookmark(q.id),
    u: () => !checked && setUnsure((u) => !u),
    e: () => checked && setShowExplanation((s) => !s),
    Escape: exit,
  }, { allowInInputs: ['Enter', 'Escape', 'u', 'b', 'e'] }); // Das einzige Feld ist numerisch, Buchstaben sind dort Kürzel

  const evaluation = checked ? evaluateAnswer(q, stored.answer) : null;
  const p = progress[q.id];
  const masteryText = (() => {
    if (!justAnswered || !stored || !p) return null;
    if (!stored.correct) return `Mastery-Serie zurückgesetzt, ${MASTERY_STREAK}× richtig in Folge nötig.`;
    if (stored.unsure) return 'Richtig, aber unsicher: zählt nicht für die Mastery-Serie. Die Frage kommt im Schwächen-Training wieder.';
    if (p.mastered && p.streak === MASTERY_STREAK) return 'Neu gemeistert! 🎉';
    if (p.mastered) return `Gemeistert (${p.streak}× in Folge richtig).`;
    const r = remainingForMastery(p);
    return `Noch ${r}× richtig in Folge bis „gemeistert“.`;
  })();
  const bookmarked = !!bookmarks[q.id];

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Kopfzeile */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Button variant="ghost" size="sm" onClick={exit} aria-label="Sitzung beenden (Esc)" title="Beenden (Esc)">
            <X size={18} />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate font-medium">{practice.title}</span>
              <span className="shrink-0 tabular-nums text-slate-500">
                {index + 1} / {questions.length}
                {answeredCount > 0 && <span className="ml-2 text-emerald-700">✓ {correctCount}</span>}
              </span>
            </div>
            <ProgressBar value={answeredCount / questions.length} className="mt-1.5 !h-1.5" label="Fortschritt der Sitzung" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-32">
        <QuestionView
          ref={numberRef}
          question={q}
          answer={answer}
          onChange={checked ? undefined : setDraft}
          choiceMode={choiceMode}
          reveal={checked}
          showExplanation={showExplanation}
          afterAnswers={
            checked && evaluation ? (
              <div
                role="status"
                className={`rounded-lg border px-4 py-3 ${evaluation.correct ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`}
              >
                <p className="font-semibold">{evaluation.correct ? 'Richtig!' : 'Leider falsch'}</p>
                {!evaluation.correct && <p className="text-sm">{describeMistake(q, evaluation)}</p>}
                {masteryText && <p className="mt-1 text-sm opacity-80">{masteryText}</p>}
                {!showExplanation && (
                  <button type="button" className="mt-1 text-sm underline" onClick={() => setShowExplanation(true)}>
                    Erklärung anzeigen (E)
                  </button>
                )}
              </div>
            ) : null
          }
          headerRight={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleBookmark(q.id)}
              aria-pressed={bookmarked}
              title="Lesezeichen (B)"
              aria-label={bookmarked ? 'Lesezeichen entfernen' : 'Lesezeichen setzen'}
            >
              {bookmarked ? <BookmarkCheck size={18} className="text-blue-600" /> : <Bookmark size={18} />}
            </Button>
          }
        />
      </main>

      {/* Fußleiste mit Aktionen */}
      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <Button variant="secondary" onClick={prev} disabled={index === 0} aria-label="Vorherige Frage (←)">
            <ArrowLeft size={18} />
          </Button>
          {!checked && (
            <Button
              variant={unsure ? 'primary' : 'secondary'}
              className={unsure ? '!bg-amber-500 hover:!bg-amber-600' : ''}
              onClick={() => setUnsure((u) => !u)}
              aria-pressed={unsure}
              title="Als unsicher markieren (U)"
            >
              <CircleHelp size={18} />
              <span className="hidden sm:inline">Unsicher</span>
            </Button>
          )}
          <div className="ml-auto hidden items-center gap-3 text-xs text-slate-500 lg:flex">
            <span><Kbd>1</Kbd>–<Kbd>5</Kbd> Antwort</span>
            <span><Kbd>U</Kbd> unsicher</span>
            <span><Kbd>B</Kbd> merken</span>
            <span><Kbd>Esc</Kbd> beenden</span>
          </div>
          <div className="ml-auto lg:ml-3">
            {checked ? (
              <Button onClick={next} size="lg" autoFocus>
                {isLast ? 'Auswertung' : 'Weiter'} <ArrowRight size={18} /> <span className="hidden sm:inline"><Kbd>Enter</Kbd></span>
              </Button>
            ) : (
              <Button onClick={check} size="lg" disabled={!isAnswered(answer)}>
                Prüfen <span className="hidden sm:inline"><Kbd>Enter</Kbd></span>
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
