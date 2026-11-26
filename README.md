# Theorie-Trainer: Führerschein Klasse B

Web-App zum Lernen für die theoretische Führerscheinprüfung (Klasse B, Deutschland).
Läuft komplett im Browser, offline-fähig (PWA). Der Lernstand bleibt lokal auf dem Gerät.

> **Hinweis zu Inhalten:** Die mitgelieferten 109 Fragen unter `data/seed/` sind **eigene,
> realistische Übungsfragen** und keine amtlichen Prüfungsfragen. Die 34 Abbildungen (23 Verkehrszeichen
> nach StVO-Vorbild, 11 Situationsskizzen) werden per `npm run media` als SVG erzeugt
> (`scripts/generate-media.ts`). Lizenzierte Kataloge lassen sich über den Import-Mechanismus
> einspielen (siehe unten). Angaben ohne Gewähr.

## Funktionen

**Lernmodi**
- **Schnelle Runde**: 10 Fragen (einstellbar), intelligent gemischt aus etwa 40 % Schwächen, 20 % fälligen Wiederholungen und 30 % neuen Fragen
- **Themen-Training**: Filter nach Kategorie (mehrere wählbar), Grund- oder Zusatzstoff, Status (neu, nicht gemeistert, zuletzt falsch, Lesezeichen, gemeistert), Reihenfolge und Anzahl
- **Schwächen-Training**: falsch oder unsicher beantwortete Fragen, die dringendsten zuerst
- **Wiederholung**: gemeisterte Fragen werden nach 3, 7, 14 bzw. 30 Tagen wieder fällig (vereinfachte Spaced Repetition)
- **Lesezeichen**: Fragen markieren und gesammelt üben
- **Prüfungssimulation**: 20 Grundstoff- und 10 Zusatzstofffragen mit genau 110 Punkten, über die Kategorien gestreut
  - Zeitlimit wählbar (Standard 45 Minuten als Trainingswert, keine amtliche Vorgabe)
  - Fragen markieren, Übersichtsraster, Antworten bis zur Abgabe änderbar
  - Bewertung nach Fehlerpunkten: bestanden mit höchstens 10, **nicht bestanden bei zwei falschen 5-Punkte-Fragen**
  - Auswertung nach Bereich mit Musterlösung für jede Frage
  - Läuft nach einem Neuladen weiter, bei Zeitablauf wird automatisch abgegeben

**Feedback & Fortschritt**
- Sofortiges Feedback: jede Option als richtig, falsch oder übersehen markiert, Erklärung pro Antwort, Musterlösung und Eselsbrücke
- Konkreter Fehlerhinweis, z. B. „1 richtige Antwort übersehen“ oder „richtig wäre 36 Monate“
- **Mastery**: Eine Frage gilt als gemeistert nach 2× sicher richtig in Folge. „Unsicher“ (Taste U) zählt nicht für die Serie, ein Fehler setzt sie zurück.
- Dashboard mit Tagesziel, Lernserie, Prüfungsreife und **Empfehlungen** (schwächstes Thema, fällige Wiederholungen, unbearbeitete Bereiche, Zeitpunkt für eine Simulation)
- Statistik:
  - Status aller Fragen und Aktivität der letzten 14 Tage (mit Tabellenansicht)
  - Fortschritt und Trefferquote pro Thema
  - häufigste Fehler und Simulationsverlauf
- Backup-Export und -Import (JSON) sowie Zurücksetzen des Lernstands

**Bedienung**: responsive (Tab-Leiste auf dem Smartphone), ablenkungsfreie Vollbildansicht beim Lernen und in der Prüfung, vollständig per Tastatur bedienbar.

| Taste | Lernen | Prüfung |
|---|---|---|
| `1`–`5` | Antwort wählen | Antwort an-/abwählen |
| `Enter` | Prüfen / Weiter | Nächste Frage (letzte: Abgeben) |
| `←` `→` | Blättern | Blättern |
| `U` | Als unsicher markieren | |
| `B` | Lesezeichen | |
| `E` | Erklärung ein-/ausblenden | |
| `M` | | Frage markieren |
| `Esc` | Sitzung beenden (mit Auswertung) | |

## Stack

Vite · React 18 · TypeScript · Tailwind CSS 4 · React Router (HashRouter) · Zustand (persistiert in `localStorage`) · Zod · Vitest · lucide-react

## Befehle

| Befehl | Zweck |
|---|---|
| `npm install` | Abhängigkeiten installieren |
| `npm run dev` | Entwicklungsserver auf http://localhost:5173 |
| `npm test` | Unit-Tests (Schema, Import, Auswertung, Mastery, Auswahl, Prüfungslogik, Statistik, Backup) |
| `npm run validate` | Alle Katalogdateien prüfen und Statistik ausgeben (`-- --strict`: Warnungen = Fehler) |
| `npm run import -- --in <datei> …` | CSV/JSON-Katalog importieren (siehe unten) |
| `npm run media` | Abbildungen (SVG) für die Seed-Fragen neu erzeugen und verknüpfen |
| `npm run schema:export` | JSON-Schema für Editor-Autovervollständigung neu erzeugen |
| `npm run build` | Prüfen, Typecheck und Produktions-Build nach `dist/` |
| `npm run preview` | Produktions-Build lokal ansehen |
| `npm run build:single` | Alles in **eine** HTML-Datei (`dist-single/index.html`, ca. 520 KB, Bilder eingebettet), läuft per Doppelklick ohne Server |

**Deployment:** `dist/` ist rein statisch, mit relativen Pfaden und HashRouter. Der Ordner läuft auf jedem Webspace, auch in Unterordnern (z. B. GitHub Pages), ohne Server-Konfiguration.

## Ordnerstruktur

```
data/
  seed/            eigene Übungsfragen, eine Datei pro Themenbereich (109 Fragen)
  imports/         lizenzierte Kataloge (gitignored)
  examples/        Beispiel-CSV für den Import
  schema/          generiertes JSON-Schema der Katalogdateien
scripts/           Node-Skripte: validate, import, schema:export
public/            PWA-Manifest, Service Worker, Icon, media/seed/ (generierte SVG-Abbildungen)
src/
  domain/          reine Logik ohne React, vollständig getestet
                   schema · categories · catalog · importMapping · answers ·
                   progress (Mastery) · selection (Modi) · exam · stats (Empfehlungen)
  store/           Zustand-Store (Fortschritt, Lesezeichen, Sitzungen, Prüfungen, Einstellungen), Backup
  data/            bindet die Katalogdateien per Vite-Glob ein
  hooks/           useHotkeys
  components/      QuestionView, QuestionListItem, Layout, UI-Bausteine
  features/        dashboard · training · practice · exam · stats · bookmarks · catalog · settings
tests/             Vitest
```

## Gespeicherte Daten

Alles liegt im `localStorage` unter dem Schlüssel `fuehrerschein-theorie-trainer`:
- Fortschritt pro Frage (gesehen, richtig, falsch, Serie, gemeistert, unsicher)
- Lesezeichen
- Prüfungshistorie (bis zu 100 Einträge)
- Tagesaktivität
- Einstellungen
- laufende Lern- und Prüfungssitzung

Das Format ist versioniert (`version` und `migrate` im Store). Fortschritt hängt an der **Frage-ID**: IDs deshalb nie ändern.

## Datenmodell

Eine Katalogdatei hat die Form `{ meta, questions }`. Fragen erben `source` und `version` aus `meta`.

```jsonc
{
  "$schema": "../schema/question-catalog.schema.json",
  "meta": { "id": "seed-vorfahrt", "title": "…", "version": "2026.11-1", "source": "seed", "license": "…" },
  "questions": [
    {
      "id": "seed-vorfahrt-001",            // eindeutig, stabil (Lernfortschritt hängt daran!)
      "officialNumber": "1.3.01-001",       // optional, Format der amtlichen Nummer
      "category": "vorfahrt",               // gefahrenlehre | verhalten | vorfahrt | verkehrszeichen | umwelt | betrieb | technik | eignung
      "subcategory": "Rechts vor links",
      "material": "grundstoff",             // grundstoff | zusatzstoff
      "licenseClasses": ["B"],              // Standard: ["B"]
      "type": "single",                     // single | multiple | number
      "points": 5,                          // 2–5
      "text": "…",
      "media": { "kind": "image", "src": "optional/pfad.jpg", "placeholder": "Situationsbeschreibung", "alt": "…" },
      "answers": [{ "id": "a", "text": "…", "correct": true, "explanation": "warum richtig/falsch" }],
      "numberAnswer": { "value": 40, "unit": "m", "tolerance": 0, "prefix": "Anhalteweg:" },  // nur bei type=number
      "explanation": "Musterlösung",
      "mnemonic": "Eselsbrücke",
      "tags": ["…"]
    }
  ]
}
```

Geprüfte Regeln (zusätzlich zu den Feldtypen):
- `single` hat genau 1 richtige Antwort, `multiple` mindestens 1 (in der Prüfung wird die Anzahl nicht verraten)
- `number` braucht `numberAnswer` und darf keine `answers` haben, Auswahlfragen umgekehrt
- Antwort-IDs sind pro Frage eindeutig, Frage-IDs katalogweit; amtliche Nummern sollten eindeutig sein (Warnung)

## Katalog importieren

```bash
npm run import -- --in pfad/katalog.csv --id amtlich-2026-10 --title "Amtlicher Katalog 10/2026" \
                  --source official --version 2026-10 --license "Lizenz XY"
npm run validate
```

- **CSV** (Trenner `,` oder `;` automatisch erkannt, UTF-8). Spalten (Groß- und Kleinschreibung egal, deutsche Aliase in Klammern):
  `id`, `officialNumber` (Nummer), `text` (Frage), `points` (Punkte), `category` (Kategorie), `material` (Stoff),
  `type` (Typ), `answer1…5` (Antwort1…5), `answer1Correct…` (Antwort1Richtig: ja/1/x/true),
  `answer1Explanation…`, `numberValue` (Zahl), `numberUnit` (Einheit), `numberTolerance`, `numberPrefix`,
  `explanation` (Erklärung), `mnemonic` (Eselsbrücke), `mediaSrc` (Bild), `mediaPlaceholder` (Bildbeschreibung),
  `mediaKind`, `mediaAlt`, `signNumber`, `licenseClasses` (Klassen, `|`-getrennt), `tags`, `version`.
- **Automatische Ableitung** aus der amtlichen Nummer `X.Y.ZZ-NNN`: `X=1` ergibt Grundstoff, `X=2` Zusatzstoff; `Y` ergibt die Kategorie
  (1 Gefahrenlehre, 2 Verhalten, 3 Vorfahrt, 4 Verkehrszeichen, 5 Umwelt, 6 Betrieb, 7 Technik, 8 Eignung); fehlende `id` wird zu `off-<Nummer>`.
- Auswahlfragen ohne `type` werden zu `multiple` (wie in der echten Prüfung). `--choice-type auto` wählt `single` bei genau einer richtigen Antwort.
- **JSON**: entweder eine fertige Katalogdatei oder ein Array von Fragen (Zielformat oder flach wie CSV).
- Ungültige Zeilen werden mit Grund gemeldet und übersprungen. `--dry-run` schreibt nichts.

Ausprobieren: `npm run import -- --in data/examples/beispiel-import.csv --id beispiel --dry-run`
