# Theorie-Trainer: Führerschein Klasse B

Web-App zum Lernen für die theoretische Führerscheinprüfung (Klasse B, Deutschland).
Läuft komplett im Browser: Der Lernfortschritt bleibt lokal, ein Server ist nicht nötig.

> **Hinweis zu Inhalten:** Die mitgelieferten Fragen unter `data/seed/` sind **eigene
> Übungsfragen** und keine amtlichen Prüfungsfragen. Lizenzierte Kataloge lassen sich
> über den Import-Mechanismus einspielen (siehe unten).

## Stack

Vite · React 18 · TypeScript · Tailwind CSS 4 · React Router · Zustand (Fortschritt, ab Meilenstein 4) · Zod (Datenvalidierung) · Vitest

## Befehle

| Befehl | Zweck |
|---|---|
| `npm install` | Abhängigkeiten installieren |
| `npm run dev` | Entwicklungsserver auf http://localhost:5173 |
| `npm test` | Unit-Tests (Schema, Katalog-Loader, Import) |
| `npm run validate` | Alle Katalogdateien prüfen und Statistik ausgeben (`-- --strict`: Warnungen = Fehler) |
| `npm run import -- --in <datei> …` | CSV/JSON-Katalog importieren (siehe unten) |
| `npm run schema:export` | JSON-Schema für Editor-Autovervollständigung neu erzeugen |
| `npm run build` | Prüfen, Typecheck und Produktions-Build nach `dist/` |

## Ordnerstruktur

```
data/
  seed/            eigene Übungsfragen, eine Datei pro Themenbereich
  imports/         lizenzierte Kataloge (gitignored)
  examples/        Beispiel-CSV für den Import
  schema/          generiertes JSON-Schema der Katalogdateien
scripts/           Node-Skripte: validate, import, schema:export
public/media/      Bilder/Videos/Verkehrszeichen
src/
  domain/          reine Logik ohne React (Schema, Kategorien, Katalog-Loader, Import-Mapping)
  data/            bindet die Katalogdateien per Vite-Glob ein
  components/      UI-Bausteine
  features/        Seiten bzw. Module (dashboard, catalog, später training, exam, stats …)
tests/             Vitest
```

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
