/**
 * Baut aus dist/ eine einzelne, eigenständige HTML-Datei (dist-single/index.html):
 * JS, CSS, Icon und alle Abbildungen sind eingebettet. Gedacht zum Teilen/Hosten an Orten,
 * die nur eine einzelne Datei erlauben (z. B. als Artefakt, per E-Mail oder USB-Stick).
 *
 *   npm run build:single
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT } from './lib/catalogFiles';

const dist = join(ROOT, 'dist');
let html = readFileSync(join(dist, 'index.html'), 'utf8');

const dataUri = (path: string, mime: string) => `data:${mime};base64,${readFileSync(path).toString('base64')}`;

// CSS einbetten
html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"[^>]*>/, (_m, file: string) => `<style>${readFileSync(join(dist, file), 'utf8')}</style>`);

// JS einbetten (ans Ende von <body>, „</script“ im Code maskieren)
let js = '';
html = html.replace(/<script type="module"[^>]*src="\.\/([^"]+)"><\/script>/, (_m, file: string) => {
  js = readFileSync(join(dist, file), 'utf8').replace(/<\/script/gi, '<\\/script');
  return '';
});

// Abbildungen als Data-URIs bereitstellen (MediaPlaceholder schaut zuerst in window.__MEDIA__)
const media: Record<string, string> = {};
const walk = (dir: string) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(svg|png|jpe?g|webp)$/i.test(f)) {
      const mime = f.endsWith('.svg') ? 'image/svg+xml' : f.endsWith('.png') ? 'image/png' : f.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
      media[relative(join(dist, 'media'), p).replace(/\\/g, '/')] = dataUri(p, mime);
    }
  }
};
walk(join(dist, 'media'));

html = html
  .replace(/<link rel="icon"[^>]*>/, () => `<link rel="icon" href="${dataUri(join(dist, 'icon.svg'), 'image/svg+xml')}" type="image/svg+xml" />`)
  .replace(/<link rel="manifest"[^>]*>\s*/, '')
  // Ersetzungsfunktion statt String: sonst würden $' / $& im JS-Code als Muster ausgewertet
  .replace('</body>', () => `<script>window.__MEDIA__=${JSON.stringify(media)};</script>\n<script type="module">${js}</script>\n</body>`);

const outDir = join(ROOT, 'dist-single');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'index.html'), html);
console.log(`✅ dist-single/index.html (${(html.length / 1024).toFixed(0)} KB, ${Object.keys(media).length} Bilder eingebettet)`);
