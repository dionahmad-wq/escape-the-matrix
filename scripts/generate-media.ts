/**
 * Erzeugt die Abbildungen (SVG) für die Seed-Fragen und trägt sie als media.src ein.
 *
 *   npm run media
 *
 * - Verkehrszeichen werden geometrisch nach dem Vorbild der StVO-Anlagen gezeichnet
 *   (amtliche Verkehrszeichen sind als amtliche Werke urheberrechtsfrei, § 5 UrhG).
 * - Situationen sind schematische Skizzen (Draufsicht/Perspektive), die die Antwort NICHT verraten.
 * - Ausgabe: public/media/seed/<frage-id>.svg; die Katalog-JSON wird minimal-invasiv ergänzt
 *   (nur "src" wird eingefügt, Formatierung bleibt erhalten).
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/catalogFiles';

// ---------------------------------------------------------------- Farben
const RED = '#c1272d';
const BLUE = '#1d5aa8';
const YELLOW = '#f5b800';
const BLACK = '#1a1a1a';
const WHITE = '#ffffff';
const GREEN = '#2a9d3a';
const AMBER = '#ffb020';
const FONT = `font-family="'DIN 1451', 'Arial Narrow', Arial, Helvetica, sans-serif" font-weight="700"`;

const svg = (w: number, h: number, body: string, title: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}">
<title>${title}</title>
${body}
</svg>
`;

// ---------------------------------------------------------------- Zeichen-Bausteine
const text = (x: number, y: number, s: string, size: number, fill = BLACK, extra = '') =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="middle" ${FONT} ${extra}>${s}</text>`;

/** Rundes Verbotszeichen (weiß, roter Rand) – Inhalt im Kreis r≈74 um (100,100). */
const prohibitionCircle = (inner: string, innerFill = WHITE) => `
<circle cx="100" cy="100" r="99" fill="${WHITE}" stroke="#9aa0a6" stroke-width="1"/>
<circle cx="100" cy="100" r="95" fill="${RED}"/>
<circle cx="100" cy="100" r="74" fill="${innerFill}"/>
${inner}`;

const triangleUp = (inner: string) => `
<path d="M100 6 L195 172 L5 172 Z" fill="${WHITE}" stroke="#9aa0a6" stroke-width="1" stroke-linejoin="round"/>
<path d="M100 14 L187 166 L13 166 Z" fill="${RED}" stroke="${RED}" stroke-width="8" stroke-linejoin="round"/>
<path d="M100 46 L160 150 L40 150 Z" fill="${WHITE}"/>
${inner}`;

const triangleDown = (dy = 0) => `
<g transform="translate(0 ${dy})">
<path d="M5 8 L195 8 L100 174 Z" fill="${WHITE}" stroke="#9aa0a6" stroke-width="1" stroke-linejoin="round"/>
<path d="M14 14 L186 14 L100 164 Z" fill="${RED}" stroke="${RED}" stroke-width="8" stroke-linejoin="round"/>
<path d="M44 30 L156 30 L100 128 Z" fill="${WHITE}"/>
</g>`;

const carFront = (x: number, y: number, color: string) => `
<g transform="translate(${x} ${y})">
  <path d="M-22 -8 L-15 -26 Q-14 -29 -10 -29 L10 -29 Q14 -29 15 -26 L22 -8 Z" fill="${color}"/>
  <rect x="-27" y="-10" width="54" height="22" rx="5" fill="${color}"/>
  <rect x="-25" y="10" width="11" height="12" rx="2" fill="${color}"/>
  <rect x="14" y="10" width="11" height="12" rx="2" fill="${color}"/>
  <path d="M-15 -10 L-10 -24 L10 -24 L15 -10 Z" fill="${WHITE}"/>
</g>`;

/** Pfeil auf Kreisbahn (gegen den Uhrzeigersinn), für Zeichen 215. */
function roundArrow(startDeg: number): string {
  const r = 52;
  const c = 100;
  const pt = (deg: number, rad = r) => [c + rad * Math.cos((deg * Math.PI) / 180), c + rad * Math.sin((deg * Math.PI) / 180)] as const;
  const end = startDeg - 78; // gegen den Uhrzeigersinn (Bildschirmkoordinaten)
  const [x1, y1] = pt(startDeg);
  const [x2, y2] = pt(end + 6);
  const tip = pt(end - 16);
  const left = pt(end + 6, r + 18);
  const right = pt(end + 6, r - 18);
  return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 0 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${WHITE}" stroke-width="15"/>
<path d="M${left[0].toFixed(1)} ${left[1].toFixed(1)} L${tip[0].toFixed(1)} ${tip[1].toFixed(1)} L${right[0].toFixed(1)} ${right[1].toFixed(1)} Z" fill="${WHITE}"/>`;
}

const SIGNS: Record<string, () => string> = {
  // Zeichen 101 Gefahrstelle
  '101': () => svg(200, 180, triangleUp(`<rect x="92" y="70" width="16" height="50" rx="4" fill="${BLACK}"/><circle cx="100" cy="134" r="9" fill="${BLACK}"/>`), 'Zeichen 101: Gefahrstelle'),

  // Zeichen 136 Kinder
  '136': () =>
    svg(
      200,
      180,
      triangleUp(`
<g fill="${BLACK}" stroke="${BLACK}" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="86" cy="80" r="8" stroke="none"/>
  <path d="M86 90 L82 116 M84 98 L70 108 M84 98 L98 104 M82 116 L72 140 M82 116 L94 138" stroke-width="7" fill="none"/>
  <circle cx="118" cy="94" r="7" stroke="none"/>
  <path d="M118 103 L116 124 M117 110 L104 116 M117 110 L130 118 M116 124 L108 144 M116 124 L126 143" stroke-width="6" fill="none"/>
</g>`),
      'Zeichen 136: Kinder',
    ),

  // Zeichen 201 Andreaskreuz
  '201': () =>
    svg(
      240,
      170,
      `<g transform="translate(120 85)">
  <g transform="rotate(32)"><rect x="-112" y="-17" width="224" height="34" fill="${WHITE}" stroke="${RED}" stroke-width="7"/></g>
  <g transform="rotate(-32)"><rect x="-112" y="-17" width="224" height="34" fill="${WHITE}" stroke="${RED}" stroke-width="7"/></g>
  <g transform="rotate(32)"><rect x="-40" y="-13.5" width="80" height="27" fill="${WHITE}"/></g>
</g>`,
      'Zeichen 201: Andreaskreuz',
    ),

  // Zeichen 205 Vorfahrt gewähren
  '205': () => svg(200, 180, triangleDown(), 'Zeichen 205: Vorfahrt gewähren'),

  // Zeichen 206 Halt. Vorfahrt gewähren
  '206': () => {
    const oct = (r: number) =>
      Array.from({ length: 8 }, (_, i) => {
        const a = ((22.5 + 45 * i) * Math.PI) / 180;
        return `${(100 + r * Math.cos(a)).toFixed(1)},${(100 + r * Math.sin(a)).toFixed(1)}`;
      }).join(' ');
    return svg(
      200,
      200,
      `<polygon points="${oct(99)}" fill="${WHITE}" stroke="#9aa0a6" stroke-width="1"/>
<polygon points="${oct(93)}" fill="${RED}"/>
<polygon points="${oct(86)}" fill="none" stroke="${WHITE}" stroke-width="4"/>
${text(100, 120, 'STOP', 56, WHITE, 'letter-spacing="1"')}`,
      'Zeichen 206: Halt. Vorfahrt gewähren.',
    );
  },

  // Zeichen 215 Kreisverkehr + 205
  '215': () =>
    svg(
      200,
      400,
      `<rect x="94" y="180" width="12" height="220" fill="#9aa0a6"/>
<circle cx="100" cy="100" r="99" fill="${WHITE}" stroke="#9aa0a6" stroke-width="1"/>
<circle cx="100" cy="100" r="95" fill="${BLUE}"/>
${roundArrow(90)}${roundArrow(210)}${roundArrow(330)}
${triangleDown(210)}`,
      'Zeichen 215: Kreisverkehr mit Zeichen 205',
    ),

  // Zeichen 220 Einbahnstraße
  '220': () =>
    svg(
      320,
      110,
      `<rect x="1" y="1" width="318" height="108" rx="8" fill="${WHITE}" stroke="#9aa0a6"/>
<rect x="5" y="5" width="310" height="100" rx="6" fill="${BLUE}"/>
<path d="M22 38 H240 V18 L298 55 L240 92 V72 H22 Z" fill="${WHITE}"/>
${text(130, 64, 'Einbahnstraße', 25)}`,
      'Zeichen 220: Einbahnstraße',
    ),

  // Zeichen 250 Verbot für Fahrzeuge aller Art
  '250': () => svg(200, 200, prohibitionCircle(''), 'Zeichen 250: Verbot für Fahrzeuge aller Art'),

  // Zeichen 253 Verbot für Kfz über 3,5 t
  '253': () =>
    svg(
      200,
      200,
      prohibitionCircle(`
<g fill="${BLACK}">
  <rect x="44" y="74" width="74" height="44" rx="2"/>
  <path d="M122 88 H142 L156 104 V122 H122 Z"/>
  <rect x="128" y="92" width="12" height="11" fill="${WHITE}"/>
  <rect x="44" y="118" width="112" height="6"/>
  <circle cx="62" cy="128" r="10"/><circle cx="84" cy="128" r="10"/><circle cx="140" cy="128" r="10"/>
</g>`),
      'Zeichen 253: Verbot für Kraftfahrzeuge über 3,5 t',
    ),

  // Zeichen 267 Verbot der Einfahrt
  '267': () =>
    svg(
      200,
      200,
      `<circle cx="100" cy="100" r="99" fill="${WHITE}" stroke="#9aa0a6" stroke-width="1"/>
<circle cx="100" cy="100" r="95" fill="${RED}"/>
<rect x="30" y="84" width="140" height="32" fill="${WHITE}"/>`,
      'Zeichen 267: Verbot der Einfahrt',
    ),

  // Zeichen 274 Höchstgeschwindigkeit 70
  '274-70': () => svg(200, 200, prohibitionCircle(text(100, 132, '70', 92)), 'Zeichen 274: Zulässige Höchstgeschwindigkeit 70 km/h'),

  // Zeichen 274 (80) mit Zusatzzeichen „bei Nässe“
  '274-80-naesse': () =>
    svg(
      200,
      300,
      `${prohibitionCircle(text(100, 132, '80', 92))}
<rect x="10" y="212" width="180" height="76" rx="6" fill="${WHITE}" stroke="${BLACK}" stroke-width="4"/>
${text(100, 262, 'bei Nässe', 36)}`,
      'Zeichen 274 (80 km/h) mit Zusatzzeichen „bei Nässe“',
    ),

  // Zeichen 274.1 Tempo-30-Zone
  '274.1': () =>
    svg(
      220,
      270,
      `<rect x="2" y="2" width="216" height="266" rx="10" fill="${WHITE}" stroke="${BLACK}" stroke-width="4"/>
<g transform="translate(30 18) scale(0.8)">${prohibitionCircle(text(100, 132, '30', 92))}</g>
${text(110, 245, 'ZONE', 54)}`,
      'Zeichen 274.1: Beginn einer Tempo-30-Zone',
    ),

  // Zeichen 275 Mindestgeschwindigkeit
  '275': () =>
    svg(
      200,
      200,
      `<circle cx="100" cy="100" r="99" fill="${WHITE}" stroke="#9aa0a6" stroke-width="1"/>
<circle cx="100" cy="100" r="95" fill="${BLUE}"/>
${text(100, 132, '30', 92, WHITE)}`,
      'Zeichen 275: Vorgeschriebene Mindestgeschwindigkeit 30 km/h',
    ),

  // Zeichen 276 Überholverbot
  '276': () => svg(200, 200, prohibitionCircle(`${carFront(70, 104, RED)}${carFront(130, 104, BLACK)}`), 'Zeichen 276: Überholverbot für Kraftfahrzeuge aller Art'),

  // Zeichen 283 Absolutes Haltverbot
  '283': () =>
    svg(
      200,
      200,
      `${prohibitionCircle('', BLUE)}
<clipPath id="c"><circle cx="100" cy="100" r="80"/></clipPath>
<g clip-path="url(#c)" stroke="${RED}" stroke-width="17"><line x1="35" y1="35" x2="165" y2="165"/><line x1="165" y1="35" x2="35" y2="165"/></g>`,
      'Zeichen 283: Absolutes Haltverbot',
    ),

  // Zeichen 286 Eingeschränktes Haltverbot
  '286': () =>
    svg(
      200,
      200,
      `${prohibitionCircle('', BLUE)}
<clipPath id="c"><circle cx="100" cy="100" r="80"/></clipPath>
<g clip-path="url(#c)" stroke="${RED}" stroke-width="17"><line x1="35" y1="35" x2="165" y2="165"/></g>`,
      'Zeichen 286: Eingeschränktes Haltverbot',
    ),

  // Zeichen 301 Vorfahrt
  '301': () =>
    svg(
      200,
      180,
      triangleUp(`<path d="M100 62 L114 84 H106 V148 H94 V84 H86 Z" fill="${BLACK}"/><rect x="64" y="110" width="72" height="9" fill="${BLACK}"/>`),
      'Zeichen 301: Vorfahrt',
    ),

  // Zeichen 306 Vorfahrtstraße
  '306': () =>
    svg(
      200,
      200,
      `<polygon points="100,2 198,100 100,198 2,100" fill="${WHITE}" stroke="#9aa0a6" stroke-width="1"/>
<polygon points="100,16 184,100 100,184 16,100" fill="${BLACK}"/>
<polygon points="100,22 178,100 100,178 22,100" fill="${WHITE}"/>
<polygon points="100,36 164,100 100,164 36,100" fill="${YELLOW}"/>`,
      'Zeichen 306: Vorfahrtstraße',
    ),

  // Zeichen 310 Ortstafel
  '310': () =>
    svg(
      340,
      160,
      `<rect x="2" y="2" width="336" height="156" rx="10" fill="${YELLOW}" stroke="${BLACK}" stroke-width="5"/>
${text(170, 86, 'Musterstadt', 54)}
<text x="170" y="126" font-size="24" fill="${BLACK}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif">Landkreis Beispiel</text>`,
      'Zeichen 310: Ortstafel Musterstadt',
    ),

  // Zeichen 325.1 Verkehrsberuhigter Bereich
  '325.1': () =>
    svg(
      300,
      200,
      `<rect x="1" y="1" width="298" height="198" rx="8" fill="${WHITE}" stroke="#9aa0a6"/>
<rect x="6" y="6" width="288" height="188" rx="6" fill="${BLUE}"/>
<g fill="${WHITE}" stroke="${WHITE}" stroke-linecap="round" stroke-linejoin="round">
  <path d="M30 168 V96 L64 66 L98 96 V168 Z" stroke="none"/>
  <rect x="54" y="128" width="20" height="40" fill="${BLUE}" stroke="none"/>
  <circle cx="128" cy="98" r="9" stroke="none"/>
  <path d="M128 108 V140 M128 116 L114 132 M128 116 L142 130 M128 140 L118 166 M128 140 L138 166" stroke-width="7" fill="none"/>
  <circle cx="164" cy="124" r="7" stroke="none"/>
  <path d="M164 132 V150 M164 138 L154 146 M164 138 L174 132 M164 150 L157 166 M164 150 L171 166" stroke-width="5" fill="none"/>
  <circle cx="184" cy="160" r="6" stroke="none"/>
  <path d="M204 150 L214 132 H252 L264 150 H272 V164 H200 V150 Z" stroke="none"/>
  <circle cx="218" cy="166" r="8" stroke="${BLUE}" stroke-width="3"/>
  <circle cx="256" cy="166" r="8" stroke="${BLUE}" stroke-width="3"/>
  <line x1="20" y1="178" x2="282" y2="178" stroke-width="3"/>
</g>`,
      'Zeichen 325.1: Verkehrsberuhigter Bereich',
    ),

  // Zeichen 331.1 Kraftfahrstraße
  '331.1': () =>
    svg(
      200,
      200,
      `<rect x="1" y="1" width="198" height="198" rx="10" fill="${WHITE}" stroke="#9aa0a6"/>
<rect x="6" y="6" width="188" height="188" rx="8" fill="${BLUE}"/>
${carFront(100, 102, WHITE).replace(`fill="${WHITE}"/>\n</g>`, `fill="${BLUE}"/>\n</g>`).replace('<g transform="translate(100 102)">', '<g transform="translate(100 102) scale(2)">')}`,
      'Zeichen 331.1: Kraftfahrstraße',
    ),

  // Zeichen 720 Grünpfeil an roter Ampel
  '720': () =>
    svg(
      280,
      280,
      `<rect x="56" y="250" width="14" height="30" fill="#6b7280"/>
<rect x="20" y="8" width="86" height="246" rx="14" fill="#222"/>
<circle cx="63" cy="52" r="28" fill="#e63946"/><circle cx="63" cy="52" r="34" fill="#e63946" opacity="0.18"/>
<circle cx="63" cy="130" r="28" fill="#4a3f1a"/>
<circle cx="63" cy="208" r="28" fill="#17321f"/>
<rect x="128" y="150" width="128" height="100" rx="6" fill="${BLACK}" stroke="#555" stroke-width="2"/>
<path d="M150 186 H210 V166 L240 200 L210 234 V214 H150 Z" fill="${GREEN}"/>`,
      'Rote Ampel mit Grünpfeilschild (Zeichen 720)',
    ),
};

// ---------------------------------------------------------------- Szenen-Bausteine
const W = 640;
const H = 360;
const GRASS = '#b9d6a3';
const ROAD = '#868c94';
const WALK = '#d6d3cd';
const HOUSE = '#e8dfd2';

type CarOpts = { label?: string; blink?: 'left' | 'right' | 'hazard'; length?: number; width?: number; kind?: 'car' | 'bus' | 'ambulance' };
/** Fahrzeug in Draufsicht, Front zeigt nach oben, gedreht um angle (Grad, im Uhrzeigersinn). */
function vehicle(x: number, y: number, angle: number, color: string, o: CarOpts = {}) {
  const L = o.length ?? (o.kind === 'bus' ? 170 : 78);
  const Wd = o.width ?? (o.kind === 'bus' ? 50 : 40);
  const hl = L / 2;
  const hw = Wd / 2;
  const lamp = (lx: number, ly: number) => `<circle cx="${lx}" cy="${ly}" r="9" fill="${AMBER}" opacity="0.35"/><circle cx="${lx}" cy="${ly}" r="4.5" fill="${AMBER}"/>`;
  const lamps: string[] = [];
  if (o.blink === 'left' || o.blink === 'hazard') lamps.push(lamp(-hw + 3, -hl + 4), lamp(-hw + 3, hl - 4));
  if (o.blink === 'right' || o.blink === 'hazard') lamps.push(lamp(hw - 3, -hl + 4), lamp(hw - 3, hl - 4));
  const windows =
    o.kind === 'bus'
      ? `<rect x="${-hw + 6}" y="${-hl + 6}" width="${Wd - 12}" height="18" rx="4" fill="#2f3e4e"/>`
      : `<path d="M${-hw + 5} ${-hl + 22} Q0 ${-hl + 14} ${hw - 5} ${-hl + 22} L${hw - 7} ${-hl + 34} H${-hw + 7} Z" fill="#2f3e4e"/>
         <path d="M${-hw + 7} ${hl - 18} H${hw - 7} L${hw - 5} ${hl - 9} Q0 ${hl - 5} ${-hw + 5} ${hl - 9} Z" fill="#2f3e4e"/>`;
  const extra =
    o.kind === 'ambulance'
      ? `<rect x="${-hw}" y="-4" width="${Wd}" height="8" fill="${RED}"/><rect x="${-hw + 6}" y="${-hl + 36}" width="10" height="6" fill="#2f7bff"/><rect x="${hw - 16}" y="${-hl + 36}" width="10" height="6" fill="#2f7bff"/><circle cx="0" cy="${-hl + 39}" r="22" fill="#2f7bff" opacity="0.18"/>`
      : '';
  const label = o.label
    ? `<g transform="rotate(${-angle})"><rect x="-21" y="-11" width="42" height="22" rx="11" fill="${WHITE}" opacity="0.92"/><text x="0" y="5" font-size="14" text-anchor="middle" fill="${BLACK}" ${FONT}>${o.label}</text></g>`
    : '';
  return `<g transform="translate(${x} ${y}) rotate(${angle})">
  <rect x="${-hw - 3}" y="${-hl + 12}" width="6" height="14" rx="2" fill="#222"/><rect x="${hw - 3}" y="${-hl + 12}" width="6" height="14" rx="2" fill="#222"/>
  <rect x="${-hw - 3}" y="${hl - 26}" width="6" height="14" rx="2" fill="#222"/><rect x="${hw - 3}" y="${hl - 26}" width="6" height="14" rx="2" fill="#222"/>
  <rect x="${-hw}" y="${-hl}" width="${Wd}" height="${L}" rx="${o.kind === 'bus' ? 6 : 10}" fill="${color}" stroke="#00000033"/>
  ${windows}${extra}${lamps.join('')}${label}
</g>`;
}

const arrow = (d: string, color = WHITE, dashed = true) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" ${dashed ? 'stroke-dasharray="12 9"' : ''} marker-end="url(#ah-${color.replace('#', '')})"/>`;
const arrowDefs = (...colors: string[]) =>
  `<defs>${colors
    .map((c) => `<marker id="ah-${c.replace('#', '')}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="${c}"/></marker>`)
    .join('')}</defs>`;

const person = (x: number, y: number, color = '#3b4cca') =>
  `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="0" rx="11" ry="7" fill="${color}"/><circle cx="0" cy="0" r="6" fill="#f1c7a3" stroke="#5a3b26" stroke-width="1.5"/></g>`;

const bike = (x: number, y: number, angle: number) =>
  `<g transform="translate(${x} ${y}) rotate(${angle})"><rect x="-2.5" y="-26" width="5" height="52" rx="2.5" fill="#222"/><rect x="-12" y="-16" width="24" height="4" rx="2" fill="#444"/><ellipse cx="0" cy="2" rx="10" ry="8" fill="#e76f51"/><circle cx="0" cy="-2" r="6" fill="#f1c7a3" stroke="#5a3b26" stroke-width="1.5"/></g>`;

/** Kreuzung: vertikale Straße x 260–380, horizontale y 120–240. */
const crossroads = (extra = '') => `
<rect width="${W}" height="${H}" fill="${GRASS}"/>
<rect x="240" y="0" width="160" height="${H}" fill="${WALK}"/><rect x="0" y="100" width="${W}" height="160" fill="${WALK}"/>
<rect x="260" y="0" width="120" height="${H}" fill="${ROAD}"/><rect x="0" y="120" width="${W}" height="120" fill="${ROAD}"/>
<g fill="${HOUSE}" stroke="#c9bba8"><rect x="30" y="10" width="180" height="75"/><rect x="430" y="10" width="180" height="75"/><rect x="30" y="275" width="180" height="75"/><rect x="430" y="275" width="180" height="75"/></g>
<g stroke="${WHITE}" stroke-width="3" stroke-dasharray="18 14"><line x1="320" y1="0" x2="320" y2="112"/><line x1="320" y1="248" x2="320" y2="${H}"/><line x1="0" y1="180" x2="252" y2="180"/><line x1="388" y1="180" x2="${W}" y2="180"/></g>
${extra}`;

/** Horizontale Straße y 120–260 mit Gehwegen. */
const street = (extra = '', houses = true) => `
<rect width="${W}" height="${H}" fill="${GRASS}"/>
<rect x="0" y="88" width="${W}" height="184" fill="${WALK}"/>
<rect x="0" y="120" width="${W}" height="140" fill="${ROAD}"/>
${houses ? `<g fill="${HOUSE}" stroke="#c9bba8"><rect x="20" y="10" width="150" height="70"/><rect x="230" y="10" width="170" height="70"/><rect x="460" y="10" width="160" height="70"/><rect x="20" y="282" width="170" height="70"/><rect x="250" y="282" width="150" height="70"/><rect x="460" y="282" width="160" height="70"/></g>` : ''}
<line x1="0" y1="190" x2="${W}" y2="190" stroke="${WHITE}" stroke-width="3" stroke-dasharray="22 16"/>
${extra}`;

/** Perspektivische Landstraße (Fluchtpunkt bei 320/150). */
const perspectiveRoad = (sky: string, ground: string, road: string, line: string) => `
<rect width="${W}" height="150" fill="${sky}"/>
<rect y="150" width="${W}" height="210" fill="${ground}"/>
<path d="M60 360 L306 150 H334 L580 360 Z" fill="${road}"/>
${[0, 1, 2, 3, 4, 5]
  .map((i) => {
    const t1 = Math.pow(0.62, i);
    const t2 = Math.pow(0.62, i + 0.5);
    const y1 = 150 + 210 * t1;
    const y2 = 150 + 210 * t2;
    const w1 = 6 * t1 + 1;
    return `<path d="M${320 - w1} ${y1.toFixed(1)} L${320 - w1 * 0.7} ${y2.toFixed(1)} H${320 + w1 * 0.7} L${320 + w1} ${y1.toFixed(1)} Z" fill="${line}"/>`;
  })
  .join('')}`;

const posts = (opacityFar: number) =>
  [0, 1, 2, 3, 4]
    .map((i) => {
      const t = Math.pow(0.6, i);
      const y = 150 + 210 * t;
      const h = 60 * t + 4;
      const w = 10 * t + 1.5;
      const xl = 320 - 290 * t - 14 * t;
      const xr = 320 + 290 * t + 14 * t;
      const op = i === 0 ? 1 : Math.max(opacityFar, 1 - i * 0.28);
      return `<g opacity="${op.toFixed(2)}"><rect x="${(xl - w / 2).toFixed(1)}" y="${(y - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${WHITE}" stroke="#555" stroke-width="0.6"/><rect x="${(xl - w / 2).toFixed(1)}" y="${(y - h).toFixed(1)}" width="${w.toFixed(1)}" height="${(h * 0.22).toFixed(1)}" fill="${BLACK}"/><rect x="${(xr - w / 2).toFixed(1)}" y="${(y - h).toFixed(1)}" width="${w.toFixed(1)}" height="${(h * 0.22 + 0).toFixed(1)}" fill="${BLACK}"/><rect x="${(xr - w / 2).toFixed(1)}" y="${(y - h * 0.78).toFixed(1)}" width="${w.toFixed(1)}" height="${(h * 0.78).toFixed(1)}" fill="${WHITE}" stroke="#555" stroke-width="0.6"/></g>`;
    })
    .join('');

const caption = (s: string) =>
  `<g><rect x="12" y="${H - 40}" width="${s.length * 8.2 + 24}" height="28" rx="14" fill="${BLACK}" opacity="0.72"/><text x="24" y="${H - 21}" font-size="15" fill="${WHITE}" font-family="Arial, Helvetica, sans-serif">${s}</text></g>`;

const SCENES: Record<string, () => string> = {
  'seed-vorfahrt-001': () =>
    svg(W, H, crossroads(`${arrowDefs(WHITE)}${vehicle(350, 310, 0, RED, { label: 'Sie' })}${vehicle(500, 150, -90, '#2563eb')}${arrow('M455 150 H410')}${arrow('M350 262 V235')}`), 'Ungeregelte Kreuzung: Ihr Pkw von unten, blauer Pkw von rechts'),

  'seed-vorfahrt-005': () =>
    svg(
      W,
      H,
      crossroads(`${arrowDefs(WHITE, AMBER)}${vehicle(350, 300, 0, RED, { label: 'Sie', blink: 'left' })}${arrow('M350 252 V215 Q350 150 280 150 H230', AMBER)}${vehicle(290, 60, 180, '#2563eb')}${arrow('M290 108 V300', WHITE)}`),
      'Kreuzung: Sie wollen links abbiegen, Gegenverkehr fährt geradeaus',
    ),

  'seed-vorfahrt-014': () =>
    svg(
      W,
      H,
      street(`${arrowDefs(WHITE)}
<g fill="${WHITE}">${Array.from({ length: 7 }, (_, i) => `<rect x="330" y="${126 + i * 19.5}" width="70" height="11"/>`).join('')}</g>
${person(365, 276, '#c2185b')}
${vehicle(130, 225, 90, RED, { label: 'Sie' })}${arrow('M180 225 H260')}`),
      'Fußgängerüberweg, Fußgängerin am Bordstein, Ihr Pkw nähert sich',
    ),

  'seed-gefahrenlehre-001': () =>
    svg(
      W,
      H,
      street(`${arrowDefs(WHITE)}
${vehicle(230, 140, 90, '#6b7280', { length: 74 })}${vehicle(330, 140, 90, '#9ca3af', { length: 74 })}${vehicle(520, 140, 90, '#4b5563', { length: 74 })}
${vehicle(250, 240, 90, '#9ca3af', { length: 74 })}${vehicle(460, 240, 90, '#6b7280', { length: 74 })}${vehicle(560, 240, 90, '#94a3b8', { length: 74 })}
<g transform="translate(410 214)"><circle r="11" fill="${WHITE}" stroke="#d32f2f" stroke-width="3"/><path d="M-11 0 H11 M0 -11 V11" stroke="#d32f2f" stroke-width="2"/></g>
<g stroke="${WHITE}" stroke-width="3" stroke-linecap="round" opacity="0.9"><line x1="424" y1="226" x2="436" y2="238"/><line x1="428" y1="216" x2="442" y2="222"/></g>
${vehicle(90, 205, 90, RED, { label: 'Sie' })}${arrow('M140 205 H190')}`),
      'Wohnstraße mit parkenden Autos, ein Ball rollt von rechts auf die Fahrbahn',
    ),

  'seed-gefahrenlehre-002': () =>
    svg(
      W,
      H,
      street(`${arrowDefs(WHITE)}
<rect x="300" y="258" width="250" height="14" fill="${WALK}"/>
<g transform="translate(560 284)"><rect x="-3" y="0" width="6" height="40" fill="#555"/><circle cx="0" cy="-2" r="13" fill="#ffd400" stroke="#2e7d32" stroke-width="4"/><text x="0" y="3" font-size="15" text-anchor="middle" fill="#2e7d32" ${FONT}>H</text></g>
${vehicle(430, 232, 90, '#f2c14e', { kind: 'bus', blink: 'hazard' })}
${person(360, 286, '#3b4cca')}${person(395, 292, '#c2185b')}${person(470, 288, '#2e7d32')}${person(520, 268, '#8e24aa')}
${vehicle(150, 232, 90, RED, { label: 'Sie' })}${arrow('M200 232 H280')}
${vehicle(560, 150, -90, '#2563eb')}`),
      'Linienbus mit Warnblinklicht an der Haltestelle, Fahrgäste steigen aus',
    ),

  'seed-gefahrenlehre-007': () =>
    svg(
      W,
      H,
      `<defs><linearGradient id="fog" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#dfe3e6" stop-opacity="0.15"/><stop offset="0.45" stop-color="#dfe3e6" stop-opacity="0.85"/><stop offset="1" stop-color="#e7eaec" stop-opacity="1"/></linearGradient></defs>
${perspectiveRoad('#cfd5d9', '#9fb39a', '#7f858c', '#f4f4f4')}
${posts(0.15)}
<rect width="${W}" height="${H}" fill="url(#fog)"/>
<rect y="0" width="${W}" height="200" fill="#e7eaec" opacity="0.55"/>
${caption('Dichter Nebel auf der Landstraße')}`,
      'Landstraße im dichten Nebel mit Leitpfosten',
    ),

  'seed-gefahrenlehre-009': () =>
    svg(
      W,
      H,
      crossroads(`${arrowDefs(WHITE, AMBER)}
<rect x="380" y="240" width="22" height="${H - 240}" fill="#c97b63"/><rect x="380" y="0" width="22" height="120" fill="#c97b63"/>
${vehicle(350, 300, 0, RED, { label: 'Sie', blink: 'right' })}${arrow('M350 252 V230 Q350 210 380 210 H440', AMBER)}
${bike(391, 300, 0)}${arrow('M391 262 V60', WHITE)}`),
      'Kreuzung: Sie wollen rechts abbiegen, Radfahrer auf dem Radweg fährt geradeaus',
    ),

  'seed-gefahrenlehre-012': () =>
    svg(
      W,
      H,
      `<defs><radialGradient id="beam" cx="0.5" cy="1" r="0.9"><stop offset="0" stop-color="#fff6c8" stop-opacity="0.85"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient></defs>
${perspectiveRoad('#0b1430', '#0f1f14', '#2a2d33', '#9a9a9a')}
<g fill="#f8fafc" opacity="0.7"><circle cx="80" cy="40" r="1.5"/><circle cx="200" cy="70" r="1.2"/><circle cx="420" cy="30" r="1.6"/><circle cx="560" cy="80" r="1.2"/><circle cx="600" cy="20" r="1.4"/></g>
<path d="M80 360 L270 175 H370 L560 360 Z" fill="url(#beam)"/>
<g transform="translate(330 214)">
  <ellipse cx="0" cy="0" rx="34" ry="15" fill="#9a6a45"/>
  <path d="M-24 6 L-27 40 M-12 8 L-13 40 M16 8 L15 40 M26 6 L28 40" stroke="#7a5236" stroke-width="5" stroke-linecap="round"/>
  <path d="M24 -6 L36 -34 L46 -30 L34 -2 Z" fill="#9a6a45"/>
  <ellipse cx="44" cy="-38" rx="11" ry="8" fill="#a8774f"/>
  <path d="M38 -44 L33 -56 L42 -46 Z M47 -45 L50 -57 L52 -44 Z" fill="#8a5a3b"/>
  <circle cx="47" cy="-39" r="2.6" fill="#ffffd0"/><circle cx="47" cy="-39" r="6" fill="#ffffd0" opacity="0.35"/>
</g>
${caption('Nachts auf der Landstraße – Reh im Scheinwerferlicht')}`,
      'Landstraße bei Nacht, Reh im Scheinwerferlicht',
    ),

  'seed-verhalten-003': () =>
    svg(
      W,
      H,
      street(`${arrowDefs(WHITE)}
${bike(400, 240, 90)}
${vehicle(380, 172, 90, RED, { label: 'Sie' })}
<g stroke="${BLACK}" stroke-width="2.5"><line x1="400" y1="194" x2="400" y2="226"/><line x1="392" y1="194" x2="408" y2="194"/><line x1="392" y1="226" x2="408" y2="226"/></g>
<g><rect x="410" y="198" width="30" height="24" rx="12" fill="${WHITE}"/><text x="425" y="216" font-size="17" text-anchor="middle" fill="${BLACK}" ${FONT}>?</text></g>
${arrow('M432 172 H500')}`),
      'Innerorts: Pkw überholt einen Radfahrer, Seitenabstand gesucht',
    ),

  'seed-verhalten-013': () =>
    svg(
      W,
      H,
      `${arrowDefs(WHITE)}<rect width="${W}" height="${H}" fill="${GRASS}"/>
<rect x="180" y="0" width="280" height="${H}" fill="${ROAD}"/>
<rect x="440" y="0" width="40" height="${H}" fill="#9aa0a6"/>
<g stroke="${WHITE}" stroke-width="3"><line x1="190" y1="0" x2="190" y2="${H}"/><line x1="440" y1="0" x2="440" y2="${H}"/></g>
<g stroke="${WHITE}" stroke-width="3" stroke-dasharray="20 18"><line x1="273" y1="0" x2="273" y2="${H}"/><line x1="357" y1="0" x2="357" y2="${H}"/></g>
<rect x="170" y="0" width="6" height="${H}" fill="#cfd4da"/>
${[-20, 70, 160].map((y, i) => vehicle(231, y + 40, 0, ['#6b7280', '#2563eb', '#9ca3af'][i]!)).join('')}
${[-10, 180].map((y, i) => vehicle(315, y + 40, 0, ['#94a3b8', '#4b5563'][i]!)).join('')}
${vehicle(315, 130, 0, RED, { label: 'Sie' })}
${[-30, 60, 150].map((y, i) => vehicle(398, y + 40, 0, ['#475569', '#9ca3af', '#64748b'][i]!)).join('')}
${vehicle(315, 312, 0, WHITE, { kind: 'ambulance' })}
<g><rect x="490" y="20" width="136" height="54" rx="8" fill="${WHITE}" opacity="0.95"/><text x="558" y="44" font-size="15" text-anchor="middle" fill="${BLACK}" ${FONT}>Stau auf 3</text><text x="558" y="63" font-size="15" text-anchor="middle" fill="${BLACK}" ${FONT}>Fahrstreifen</text></g>`,
      'Dreistreifige Autobahn im Stau, Ihr Pkw auf dem mittleren Fahrstreifen, Rettungswagen nähert sich von hinten',
    ),

  'seed-eignung-008': () =>
    svg(
      W,
      H,
      `${arrowDefs(WHITE)}<rect width="${W}" height="${H}" fill="${GRASS}"/>
<rect x="0" y="120" width="${W}" height="110" fill="${ROAD}"/>
<line x1="0" y1="175" x2="${W}" y2="175" stroke="${WHITE}" stroke-width="3" stroke-dasharray="22 16"/>
<rect x="0" y="232" width="${W}" height="10" fill="#8fb37a"/>
<g fill="#5d8a4a" opacity="0.6"><circle cx="60" cy="60" r="34"/><circle cx="130" cy="44" r="28"/><circle cx="540" cy="58" r="36"/><circle cx="600" cy="300" r="30"/></g>
${vehicle(440, 286, 118, '#2563eb', { blink: 'hazard' })}
${person(372, 252, '#6d4c41')}
${vehicle(110, 205, 90, RED, { label: 'Sie' })}${arrow('M160 205 H240')}
${caption('Unfall auf der Landstraße – Sie kommen als Erste/r an')}`,
      'Landstraße: Pkw im Graben mit Warnblinklicht, eine Person am Straßenrand',
    ),
};

/** Zuordnung Frage-ID → Bildgenerator. */
const SIGN_FOR: Record<string, string> = {
  'seed-verhalten-010': '201',
  'seed-verkehrszeichen-001': '205',
  'seed-verkehrszeichen-002': '274-70',
  'seed-verkehrszeichen-003': '275',
  'seed-verkehrszeichen-004': '283',
  'seed-verkehrszeichen-005': '286',
  'seed-verkehrszeichen-006': '250',
  'seed-verkehrszeichen-007': '267',
  'seed-verkehrszeichen-008': '276',
  'seed-verkehrszeichen-009': '101',
  'seed-verkehrszeichen-010': '136',
  'seed-verkehrszeichen-011': '325.1',
  'seed-verkehrszeichen-012': '274.1',
  'seed-verkehrszeichen-013': '220',
  'seed-verkehrszeichen-014': '310',
  'seed-verkehrszeichen-015': '253',
  'seed-verkehrszeichen-016': '331.1',
  'seed-verkehrszeichen-017': '274-80-naesse',
  'seed-vorfahrt-002': '206',
  'seed-vorfahrt-004': '720',
  'seed-vorfahrt-006': '215',
  'seed-vorfahrt-010': '301',
  'seed-vorfahrt-011': '306',
};

// ---------------------------------------------------------------- Ausführung
const outDir = join(ROOT, 'public/media/seed');
mkdirSync(outDir, { recursive: true });

const generators: Record<string, () => string> = { ...SCENES };
for (const [id, sign] of Object.entries(SIGN_FOR)) {
  const g = SIGNS[sign];
  if (!g) throw new Error(`Unbekanntes Zeichen ${sign}`);
  generators[id] = g;
}

let written = 0;
for (const [id, gen] of Object.entries(generators)) {
  writeFileSync(join(outDir, `${id}.svg`), gen());
  written++;
}

// Katalogdateien ergänzen: "src" nach "kind" einfügen (Reihenfolge der media-Zeilen = Reihenfolge der Fragen mit media)
const seedDir = join(ROOT, 'data/seed');
let linked = 0;
const missing: string[] = [];
for (const file of readdirSync(seedDir).filter((f) => f.endsWith('.json'))) {
  const path = join(seedDir, file);
  let raw = readFileSync(path, 'utf8');
  const data = JSON.parse(raw) as { questions: { id: string; media?: { src?: string } }[] };
  const ids = data.questions.filter((q) => q.media).map((q) => q.id);
  let i = 0;
  raw = raw.replace(/"media": \{ "kind": "(\w+)",( "src": "[^"]*",)?/g, (_m, kind: string) => {
    const id = ids[i++]!;
    if (!generators[id]) {
      missing.push(id);
      return `"media": { "kind": "${kind}",`;
    }
    linked++;
    return `"media": { "kind": "${kind}", "src": "seed/${id}.svg",`;
  });
  writeFileSync(path, raw);
}

console.log(`✅ ${written} Bilder erzeugt (public/media/seed), ${linked} Fragen verknüpft`);
if (missing.length) {
  console.log(`⚠️  Ohne Bild: ${missing.join(', ')}`);
  process.exitCode = 1;
}
