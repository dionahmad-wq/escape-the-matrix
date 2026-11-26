import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, PlayCircle, XCircle } from 'lucide-react';
import { catalog } from '@/data/catalog';
import { composeExam, EXAM_CONFIG_B } from '@/domain/exam';
import { Badge, Button, Card, EmptyState, PageTitle, SectionTitle, formatDateTime, formatDuration } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

export function ExamIntroPage() {
  const navigate = useNavigate();
  const settings = useAppStore((s) => s.settings);
  const activeExam = useAppStore((s) => s.activeExam);
  const history = useAppStore((s) => s.examHistory);
  const startExam = useAppStore((s) => s.startExam);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const config = EXAM_CONFIG_B;

  const available = {
    grundstoff: catalog.questions.filter((q) => q.material === 'grundstoff' && q.licenseClasses.includes(config.licenseClass)).length,
    zusatzstoff: catalog.questions.filter((q) => q.material === 'zusatzstoff' && q.licenseClasses.includes(config.licenseClass)).length,
  };
  const reduced = available.grundstoff < config.grundstoffCount || available.zusatzstoff < config.zusatzstoffCount;

  const start = () => {
    const qs = composeExam(catalog.questions, config);
    startExam(config.id, qs.map((q) => q.id), settings.examMinutes || null);
    navigate('/pruefung/laufend');
  };

  const passed = history.filter((e) => e.passed).length;

  return (
    <div className="space-y-8">
      <PageTitle sub="Realistischer Testlauf nach der Bewertungslogik der amtlichen Prüfung.">Prüfungssimulation</PageTitle>

      {activeExam && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-blue-200 bg-blue-50 p-4">
          <div>
            <p className="font-medium text-blue-900">Eine Prüfung läuft noch</p>
            <p className="text-sm text-blue-800">
              {Object.keys(activeExam.answers).length} von {activeExam.questionIds.length} Fragen beantwortet.
            </p>
          </div>
          <Button onClick={() => navigate('/pruefung/laufend')}>Fortsetzen</Button>
        </Card>
      )}

      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold">{config.label}</h2>
        <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <li>• {config.grundstoffCount + config.zusatzstoffCount} Fragen: {config.grundstoffCount} Grundstoff + {config.zusatzstoffCount} Zusatzstoff</li>
          <li>• Insgesamt {config.targetPoints} Punkte, jede Frage 2–5 Punkte</li>
          <li>• Bestanden mit höchstens <strong>{config.maxErrorPoints} Fehlerpunkten</strong></li>
          <li>• Nicht bestanden bei <strong>zwei falschen 5-Punkte-Fragen</strong></li>
          <li>• Eine Frage ist nur richtig, wenn <em>alle</em> richtigen und keine falschen Antworten angekreuzt sind</li>
          <li>• Auswertung erst nach dem Abgeben, Antworten bis dahin änderbar</li>
        </ul>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Clock size={16} className="text-slate-500" />
            Zeitlimit
            <select
              value={settings.examMinutes}
              onChange={(e) => updateSettings({ examMinutes: Number(e.target.value) })}
              className="rounded-md border border-slate-300 bg-white px-2 py-1"
            >
              {[0, 30, 45, 60].map((m) => (
                <option key={m} value={m}>
                  {m === 0 ? 'ohne' : `${m} Minuten`}
                </option>
              ))}
            </select>
          </label>
          <Button size="lg" className="ml-auto" onClick={start} disabled={available.grundstoff + available.zusatzstoff === 0}>
            <PlayCircle size={20} /> {activeExam ? 'Neue Prüfung starten' : 'Prüfung starten'}
          </Button>
        </div>
        {reduced && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Der Katalog enthält derzeit nur {available.grundstoff} Grundstoff- und {available.zusatzstoff} Zusatzstofffragen, die Simulation wird entsprechend verkürzt.
          </p>
        )}
        {activeExam && <p className="mt-2 text-xs text-slate-500">Ein Neustart verwirft die laufende Prüfung.</p>}
      </Card>

      <section>
        <SectionTitle right={history.length > 0 && <span className="text-sm text-slate-500">{passed} von {history.length} bestanden</span>}>
          Bisherige Simulationen
        </SectionTitle>
        {history.length === 0 ? (
          <EmptyState title="Noch keine Simulation absolviert">Starte deine erste Prüfung, um deinen Stand zu testen.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {history.slice(0, 15).map((e) => (
              <li key={e.id}>
                <Link to={`/pruefung/ergebnis/${e.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                  {e.passed ? <CheckCircle2 className="text-emerald-600" size={20} /> : <XCircle className="text-rose-600" size={20} />}
                  <div className="flex-1">
                    <div className="text-sm font-medium">{e.passed ? 'Bestanden' : 'Nicht bestanden'}</div>
                    <div className="text-xs text-slate-500">
                      {formatDateTime(e.finishedAt)} · {formatDuration(e.durationSec)} min{e.timedOut ? ' · Zeit abgelaufen' : ''}
                    </div>
                  </div>
                  <Badge tone={e.passed ? 'emerald' : 'rose'}>{e.errorPoints} Fehlerpunkte</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
