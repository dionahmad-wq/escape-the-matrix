import type { Media } from '@/domain/types';

/** Zeigt das Bild, falls vorhanden, sonst einen beschrifteten Platzhalter. */
export function MediaPlaceholder({ media }: { media: Media }) {
  if (media.src) {
    const src = /^https?:\/\//.test(media.src) ? media.src : `/media/${media.src}`;
    return media.kind === 'video' ? (
      <video src={src} controls className="w-full rounded-lg border border-slate-200" aria-label={media.alt} />
    ) : (
      <img src={src} alt={media.alt} className="w-full max-h-72 object-contain rounded-lg border border-slate-200 bg-white" />
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
