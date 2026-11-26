import { describe, expect, it } from 'vitest';
import { applyAnswer } from '../src/domain/progress';
import { createBackup, parseBackup } from '../src/store/backup';
import { DEFAULT_SETTINGS, type PersistedData } from '../src/store/useAppStore';

const data: PersistedData = {
  progress: { q1: applyAnswer(undefined, true, false, 1) },
  bookmarks: { q2: 5 },
  examHistory: [],
  activity: { '2026-11-26': { answered: 3, correct: 2 } },
  settings: DEFAULT_SETTINGS,
  practice: null,
  activeExam: null,
};

describe('Backup', () => {
  it('Roundtrip export → import', () => {
    const backup = createBackup(data, new Date('2026-11-26T10:00:00Z'));
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.backup.data.progress).toEqual(data.progress);
  });

  it('lehnt ungültige Dateien ab', () => {
    expect(parseBackup('kein json')).toEqual({ ok: false, error: 'Die Datei ist kein gültiges JSON.' });
    expect(parseBackup(JSON.stringify({ app: 'andere-app' })).ok).toBe(false);
  });

  it('lehnt Sicherungen neuerer Versionen ab', () => {
    const backup = { ...createBackup(data), version: 99 };
    const r = parseBackup(JSON.stringify(backup));
    expect(r.ok).toBe(false);
  });
});
