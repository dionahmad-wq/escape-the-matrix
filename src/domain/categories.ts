/**
 * Themenbereiche des Fragenkatalogs.
 *
 * Die Gliederung orientiert sich an der Struktur des amtlichen Katalogs
 * (Sachgebiete 1.1–1.8 im Grundstoff, 2.x im klassenspezifischen Zusatzstoff).
 * `officialSection` ist die zweite Stelle der amtlichen Fragenummer und wird
 * beim Import genutzt, um Kategorien automatisch zuzuordnen.
 */
export const CATEGORY_IDS = [
  'gefahrenlehre',
  'verhalten',
  'vorfahrt',
  'verkehrszeichen',
  'umwelt',
  'betrieb',
  'technik',
  'eignung',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  short: string;
  description: string;
  /** Zweite Stelle der amtlichen Nummer, z. B. "3" in "1.3.01-001". */
  officialSection: number;
}

export const CATEGORIES: Record<CategoryId, CategoryInfo> = {
  gefahrenlehre: {
    id: 'gefahrenlehre',
    label: 'Gefahrenlehre',
    short: 'Gefahren',
    description: 'Gefahren erkennen, Verhalten gegenüber anderen Verkehrsteilnehmern, Witterung, Dunkelheit.',
    officialSection: 1,
  },
  verhalten: {
    id: 'verhalten',
    label: 'Verhalten im Straßenverkehr',
    short: 'Verhalten',
    description: 'Geschwindigkeit, Abstand, Überholen, Halten und Parken, Autobahn, Bahnübergänge.',
    officialSection: 2,
  },
  vorfahrt: {
    id: 'vorfahrt',
    label: 'Vorfahrt & Vorrang',
    short: 'Vorfahrt',
    description: 'Rechts vor links, Abbiegen, Polizeibeamte, Lichtzeichen, Kreisverkehr.',
    officialSection: 3,
  },
  verkehrszeichen: {
    id: 'verkehrszeichen',
    label: 'Verkehrszeichen',
    short: 'Zeichen',
    description: 'Gefahr-, Vorschrift- und Richtzeichen, Markierungen, Verkehrseinrichtungen.',
    officialSection: 4,
  },
  umwelt: {
    id: 'umwelt',
    label: 'Umweltschutz',
    short: 'Umwelt',
    description: 'Kraftstoffsparend und umweltbewusst fahren, Lärm, Abgase.',
    officialSection: 5,
  },
  betrieb: {
    id: 'betrieb',
    label: 'Vorschriften über den Betrieb',
    short: 'Betrieb',
    description: 'Ladung, Beleuchtung, Anhänger, Papiere, Haupt- und Abgasuntersuchung.',
    officialSection: 6,
  },
  technik: {
    id: 'technik',
    label: 'Technik',
    short: 'Technik',
    description: 'Bremsen, Reifen, Lenkung, Fahrphysik, Assistenzsysteme.',
    officialSection: 7,
  },
  eignung: {
    id: 'eignung',
    label: 'Eignung & Befähigung',
    short: 'Eignung',
    description: 'Alkohol, Drogen, Medikamente, Müdigkeit, Erste Hilfe, Verhalten nach Unfällen.',
    officialSection: 8,
  },
};

export const CATEGORY_LIST: CategoryInfo[] = CATEGORY_IDS.map((id) => CATEGORIES[id]);

export function categoryFromOfficialSection(section: number): CategoryId | undefined {
  return CATEGORY_LIST.find((c) => c.officialSection === section)?.id;
}
