# data/imports/

Ablage für **lizenzierte** Fragenkataloge. Alle Dateien hier außer dieser README
sind per `.gitignore` vom Repository ausgeschlossen, damit urheberrechtlich
geschützte Inhalte nicht versehentlich veröffentlicht werden.

Dateien werden mit `npm run import` erzeugt (siehe Haupt-README) und beim
nächsten `npm run dev` bzw. `npm run build` automatisch geladen.

Bilder bzw. Videos zu den Fragen gehören nach `public/media/` (z. B.
`public/media/official/1.1.02-001.jpg`); in der Fragen-JSON steht dann
`"media": { "src": "official/1.1.02-001.jpg", … }`.
