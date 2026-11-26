import type { Media } from '@/domain/types';

/** Zeigt das Bild, falls vorhanden, sonst einen beschrifteten Platzhalter. */
export function MediaPlaceholder({ media }: { media: Media }) {
  if (media.src) {
    // Einzeldatei-Build (npm run build:single) bettet die Bilder als Data-URIs in window.__MEDIA__ ein
    const embedded = (window as unknown as { __MEDIA__?: Record<string, string> }).__MEDIA__?.[media.src];
    const src = embedded ?? (/^https?:\/\//.test(media.src) ? media.src : `${import.meta.env.BASE_URL}media/${media.src}`);
    return media.kind === 'video' ? (
      <video src={src} controls className="w-full rounded-lg border border-slate-200" aria-label={media.alt} />
    ) : (
      <figure className={`overflow-hidden rounded-lg border border-slate-200 ${media.kind === 'sign' ? 'bg-slate-50 py-4' : 'bg-white'}`}>
        <img
          src={src}
          alt={media.alt}
          loading="lazy"
          decoding="async"
          className={media.kind === 'sign' ? 'mx-auto h-36 w-auto object-contain sm:h-44' : 'block h-auto max-h-80 w-full object-contain'}
        />
      </figure>
    );
  }
  const label = media.kind === 'sign' ? `Verkehrszeichen${media.signNumber ? ` ${media.signNumber}` : ''}` : media.kind === 'video' ? 'Video' : 'Bild';
  return (
    <figure
      role="img"
      aria-label={media.alt}
      className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-slate-100 px-4 py-6 text-center"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label} · Platzhalter</span>
      <figcaption className="text-sm text-slate-700">{media.placeholder}</figcaption>
    </figure>
  );
}
