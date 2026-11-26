import { forwardRef, useEffect, useState, type ReactNode } from 'react';
import { Check, Lightbulb, X } from 'lucide-react';
import { evaluateAnswer, formatNumber, parseNumberInput, toggleChoice, type UserAnswer } from '@/domain/answers';
import { CATEGORIES } from '@/domain/categories';
import type { Question } from '@/domain/types';
import { MediaPlaceholder } from './MediaPlaceholder';
import { Badge } from './ui';

export interface QuestionViewProps {
  question: Question;
  answer: UserAnswer;
  /** Fehlt onChange, ist die Ansicht schreibgeschützt. */
  onChange?: (answer: UserAnswer) => void;
  /** radio = genau eine Auswahl, checkbox = beliebig viele (Prüfungsmodus). */
  choiceMode: 'radio' | 'checkbox';
  /** Richtig/Falsch-Markierung anzeigen. */
  reveal?: boolean;
  /** Erklärungen, Musterlösung und Eselsbrücke anzeigen (nur mit reveal). */
  showExplanation?: boolean;
  /** Zusatzinhalt rechts in der Kopfzeile (z. B. Lesezeichen-Button). */
  headerRight?: ReactNode;
  /** Inhalt direkt nach den Antworten, vor der Erklärung (z. B. Richtig/Falsch-Feedback). */
  afterAnswers?: ReactNode;
  compact?: boolean;
}

/** Zentrale Fragenansicht für Übung, Prüfung und Auswertung. */
export const QuestionView = forwardRef<HTMLInputElement, QuestionViewProps>(function QuestionView(
  { question: q, answer, onChange, choiceMode, reveal = false, showExplanation = false, headerRight, afterAnswers, compact = false },
  numberInputRef,
) {
  const readOnly = !onChange || reveal;
  const evaluation = reveal ? evaluateAnswer(q, answer) : null;

  return (
    <article className="space-y-4" aria-label="Frage">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge>{CATEGORIES[q.category].short}{q.subcategory ? ` · ${q.subcategory}` : ''}</Badge>
        <Badge>{q.material === 'grundstoff' ? 'Grundstoff' : 'Zusatzstoff'}</Badge>
        <Badge tone="blue">{q.points} Punkte</Badge>
        {q.officialNumber && <span className="font-mono text-xs text-slate-400">{q.officialNumber}</span>}
        <div className="ml-auto flex items-center gap-1">{headerRight}</div>
      </div>

      <h2 className={`${compact ? 'text-base' : 'text-lg sm:text-xl'} font-medium leading-snug text-slate-900`}>{q.text}</h2>

      {q.media && <MediaPlaceholder media={q.media} />}

      {q.type === 'number' ? (
        <NumberAnswerInput
          ref={numberInputRef}
          question={q}
          answer={answer}
          readOnly={readOnly}
          onChange={onChange}
          correct={evaluation?.correct}
        />
      ) : (
        <div>
          <p className="mb-2 text-xs text-slate-500">
            {choiceMode === 'radio' ? 'Genau eine Antwort ist richtig.' : 'Eine oder mehrere Antworten können richtig sein.'}
          </p>
          <ul className="space-y-2" role={choiceMode === 'radio' ? 'radiogroup' : 'group'} aria-label="Antworten">
            {(q.answers ?? []).map((opt, i) => {
              const selected = answer.kind === 'choice' && answer.selected.includes(opt.id);
              let state: 'idle' | 'selected' | 'right' | 'wrong' | 'missed' | 'neutral' = selected ? 'selected' : 'idle';
              if (reveal) {
                if (opt.correct && selected) state = 'right';
                else if (opt.correct) state = 'missed';
                else if (selected) state = 'wrong';
                else state = 'neutral';
              }
              const styles = {
                idle: 'border-slate-200 bg-white hover:border-slate-400',
                selected: 'border-blue-600 bg-blue-50 ring-1 ring-blue-600',
                right: 'border-emerald-500 bg-emerald-50',
                wrong: 'border-rose-500 bg-rose-50',
                missed: 'border-emerald-500 border-dashed bg-white',
                neutral: 'border-slate-200 bg-white opacity-70',
              }[state];
              const box = choiceMode === 'radio' ? 'rounded-full' : 'rounded';
              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    role={choiceMode === 'radio' ? 'radio' : 'checkbox'}
                    aria-checked={selected}
                    disabled={readOnly}
                    data-hotkeys-enter
                    onClick={() => onChange?.(toggleChoice(answer, opt.id, choiceMode))}
                    className={`flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors disabled:cursor-default ${styles}`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border text-[11px] font-semibold ${box} ${
                        selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-slate-500'
                      } ${state === 'right' ? '!border-emerald-600 !bg-emerald-600' : ''} ${state === 'wrong' ? '!border-rose-600 !bg-rose-600' : ''}`}
                      aria-hidden
                    >
                      {selected ? <Check size={13} strokeWidth={3} /> : i + 1}
                    </span>
                    <span className="flex-1">
                      <span className="block text-[15px] text-slate-800">{opt.text}</span>
                      {reveal && (
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          {state === 'right' && <span className="font-medium text-emerald-700">✓ Richtig angekreuzt</span>}
                          {state === 'missed' && <span className="font-medium text-emerald-700">Richtig, aber nicht angekreuzt</span>}
                          {state === 'wrong' && <span className="font-medium text-rose-700">✗ Falsch angekreuzt</span>}
                          {state === 'neutral' && <span className="text-slate-500">Falsch, richtig nicht angekreuzt</span>}
                        </span>
                      )}
                      {reveal && showExplanation && opt.explanation && (
                        <span className="mt-1 block text-sm text-slate-600">{opt.explanation}</span>
                      )}
                    </span>
                    {reveal && (opt.correct ? <Check className="mt-0.5 shrink-0 text-emerald-600" size={18} /> : <X className="mt-0.5 shrink-0 text-slate-400" size={18} />)}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {afterAnswers}

      {reveal && showExplanation && <Explanation question={q} />}
    </article>
  );
});

export function Explanation({ question: q }: { question: Question }) {
  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Erklärung</p>
        <p className="mt-1 text-[15px] leading-relaxed text-slate-800">{q.explanation}</p>
      </div>
      {q.mnemonic && (
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <Lightbulb size={18} className="mt-0.5 shrink-0" aria-hidden />
          <p className="text-[15px]">
            <span className="font-semibold">Eselsbrücke: </span>
            {q.mnemonic}
          </p>
        </div>
      )}
    </div>
  );
}

const NumberAnswerInput = forwardRef<
  HTMLInputElement,
  { question: Question; answer: UserAnswer; readOnly: boolean; onChange?: (a: UserAnswer) => void; correct?: boolean }
>(function NumberAnswerInput({ question, answer, readOnly, onChange, correct }, ref) {
  const value = answer.kind === 'number' ? answer.value : null;
  const [text, setText] = useState(value === null ? '' : formatNumber(value));

  // Bei Fragewechsel bzw. externem Zurücksetzen Text synchronisieren
  useEffect(() => {
    setText((prev) => {
      const parsed = parseNumberInput(prev);
      return parsed === value ? prev : value === null ? '' : formatNumber(value);
    });
  }, [value, question.id]);

  const na = question.numberAnswer!;
  const invalid = text.trim() !== '' && parseNumberInput(text) === null;
  const border =
    correct === undefined ? (invalid ? 'border-rose-400' : 'border-slate-300 focus:border-blue-600') : correct ? 'border-emerald-500 bg-emerald-50' : 'border-rose-500 bg-rose-50';

  return (
    <div>
      <label className="flex flex-wrap items-center gap-2 text-slate-700">
        {na.prefix && <span>{na.prefix}</span>}
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-label="Zahlenantwort"
          aria-invalid={invalid}
          readOnly={readOnly}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onChange?.({ kind: 'number', value: parseNumberInput(e.target.value) });
          }}
          className={`w-32 rounded-lg border-2 px-3 py-2 text-lg tabular-nums outline-none ${border}`}
          placeholder="?"
        />
        {na.unit && <span>{na.unit}</span>}
      </label>
      {invalid && <p className="mt-1 text-xs text-rose-600">Bitte eine Zahl eingeben (Komma oder Punkt erlaubt).</p>}
      {correct === false && (
        <p className="mt-2 text-sm font-medium text-emerald-700">
          Richtig wäre: {na.prefix ? `${na.prefix} ` : ''}
          {formatNumber(na.value)}
          {na.unit ? ` ${na.unit}` : ''}
        </p>
      )}
    </div>
  );
});
