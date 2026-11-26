import { useRef, useState } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { catalog } from '@/data/catalog';
import { MASTERY_STREAK } from '@/domain/progress';
import { Button, Card, ConfirmDialog, Kbd, PageTitle, SectionTitle } from '@/components/ui';
import { createBackup, downloadJson, parseBackup, type Backup } from '@/store/backup';
import { useAppStore } from '@/store/useAppStore';

export function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const replaceData = useAppStore((s) => s.replaceData);
  const resetAll = useAppStore((s) => s.resetAll);
  const progressCount = useAppStore((s) => Object.keys(s.progress).length);
  const examCount = useAppStore((s) => s.examHistory.length);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const exportBackup = () => {
    const backup = createBackup(useAppStore.getState());
    downloadJson(`theorie-trainer-backup-${backup.exportedAt.slice(0, 10)}.json`, backup);
    setMessage({ tone: 'ok', text: 'Sicherung heruntergeladen.' });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const result = parseBackup(await file.text());
    if (fileRef.current) fileRef.current.value = '';
    if (!result.ok) setMessage({ tone: 'error', text: result.error });
    else setPending(result.backup);
  };

  return (
    <div className="space-y-8">
      <PageTitle>Einstellungen</PageTitle>

      <section>
        <SectionTitle>Lernen</SectionTitle>
        <Card className="divide-y divide-slate-100">
          <NumberSetting label="Tagesziel" hint="Fragen pro Tag" value={settings.dailyGoal} min={5} max={200} step={5} onChange={(v) => updateSettings({ dailyGoal: v })} />
          <NumberSetting label="Schnelle Runde" hint="Fragen pro Runde" value={settings.quickRoundSize} min={5} max={30} step={1} onChange={(v) => updateSettings({ quickRoundSize: v })} />
          <NumberSetting label="Zeitlimit Prüfung" hint="Minuten (0 = ohne)" value={settings.examMinutes} min={0} max={120} step={5} onChange={(v) => updateSettings({ examMinutes: v })} />
          <ToggleSetting label="Erklärung automatisch zeigen" hint="Nach dem Prüfen sofort Musterlösung und Eselsbrücke einblenden" checked={settings.autoShowExplanation} onChange={(v) => updateSettings({ autoShowExplanation: v })} />
          <ToggleSetting label="Bei richtiger Antwort automatisch weiter" hint="Nach 1,2 Sekunden zur nächsten Frage" checked={settings.autoAdvanceOnCorrect} onChange={(v) => updateSettings({ autoAdvanceOnCorrect: v })} />
        </Card>
        <p className="mt-2 text-xs text-slate-500">
          Eine Frage gilt als <strong>gemeistert</strong>, wenn sie {MASTERY_STREAK}× hintereinander sicher richtig beantwortet wurde. Als „unsicher“ markierte richtige Antworten zählen nicht für die Serie.
        </p>
      </section>

      <section>
        <SectionTitle>Tastenkürzel</SectionTitle>
        <Card className="grid gap-x-8 gap-y-2 p-4 text-sm sm:grid-cols-2">
          {[
            [['1', '…', '5'], 'Antwort an-/abwählen'],
            [['Enter'], 'Prüfen / Weiter'],
            [['←', '→'], 'Vorherige / nächste Frage'],
            [['U'], 'Als unsicher markieren (Lernen)'],
            [['B'], 'Lesezeichen setzen (Lernen)'],
            [['E'], 'Erklärung ein-/ausblenden'],
            [['M'], 'Frage markieren (Prüfung)'],
            [['Esc'], 'Sitzung beenden'],
          ].map(([keys, label]) => (
            <div key={label as string} className="flex items-center justify-between gap-3">
              <span className="text-slate-700">{label as string}</span>
              <span className="flex gap-1">{(keys as string[]).map((k) => (k === '…' ? <span key={k}>–</span> : <Kbd key={k}>{k}</Kbd>))}</span>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>Daten & Sicherung</SectionTitle>
        <Card className="space-y-4 p-4">
          <p className="text-sm text-slate-600">
            Dein Lernstand ({progressCount} bearbeitete Fragen, {examCount} Simulationen) wird nur lokal in diesem Browser gespeichert. Mit einer Sicherung kannst du ihn auf ein anderes Gerät übertragen.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportBackup}>
              <Download size={16} /> Sicherung exportieren
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> Sicherung importieren
            </Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <Button variant="ghost" className="!text-rose-700 hover:!bg-rose-50 sm:ml-auto" onClick={() => setConfirmReset(true)}>
              <Trash2 size={16} /> Lernstand zurücksetzen
            </Button>
          </div>
          {message && (
            <p role="status" className={`rounded-lg px-3 py-2 text-sm ${message.tone === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
              {message.text}
            </p>
          )}
        </Card>
      </section>

      <section>
        <SectionTitle>Über diese App</SectionTitle>
        <Card className="space-y-2 p-4 text-sm text-slate-600">
          <p>
            Fragenkatalog: {catalog.questions.length} Fragen aus {catalog.files.length} Dateien ({catalog.files.map((f) => f.meta.title).join(', ')}).
          </p>
          <p>
            Die mitgelieferten Fragen sind eigene, realistische Übungsfragen und <strong>keine amtlichen Prüfungsfragen</strong>. Amtliche Fragen und Abbildungen unterliegen Urheber- bzw. Lizenzrechten. Lizenzierte Kataloge können über das Import-Skript eingebunden werden (siehe README).
          </p>
          <p>Angaben ohne Gewähr. Maßgeblich sind StVO, StVZO, FeV und der aktuelle amtliche Fragenkatalog.</p>
        </Card>
      </section>

      <ConfirmDialog
        open={pending !== null}
        title="Sicherung wiederherstellen?"
        confirmLabel="Wiederherstellen"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) replaceData({ ...pending.data, settings: { ...settings, ...pending.data.settings } });
          setPending(null);
          setMessage({ tone: 'ok', text: 'Sicherung wiederhergestellt.' });
        }}
      >
        {pending && (
          <p>
            Sicherung vom {new Date(pending.exportedAt).toLocaleString('de-DE')} mit {Object.keys(pending.data.progress).length} bearbeiteten Fragen und {pending.data.examHistory.length} Simulationen. Der aktuelle Lernstand wird <strong>ersetzt</strong>.
          </p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmReset}
        title="Lernstand wirklich zurücksetzen?"
        tone="danger"
        confirmLabel="Alles löschen"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetAll();
          setConfirmReset(false);
          setMessage({ tone: 'ok', text: 'Lernstand zurückgesetzt.' });
        }}
      >
        Fortschritt, Lesezeichen, Simulationen und Einstellungen werden gelöscht. Tipp: Vorher eine Sicherung exportieren.
      </ConfirmDialog>
    </div>
  );
}

function NumberSetting({ label, hint, value, min, max, step, onChange }: { label: string; hint: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 px-4 py-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, Math.round(v))));
        }}
        className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-right tabular-nums"
      />
    </label>
  );
}

function ToggleSetting({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-blue-600" />
    </label>
  );
}
