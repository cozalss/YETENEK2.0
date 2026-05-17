/**
 * Test sırasında "nasıl yapılır" rehber videosunu gösteren küçük panel.
 * Otomatik loop + muted + inline; çocuk testi yaparken yan tarafta sürekli
 * referans olarak duruyor. Test akışına dokunmaz, sadece görsel rehber.
 */

'use client';

interface GuideVideoProps {
  src: string;
  label: string;
  caption?: string;
}

export function GuideVideo({ src, label, caption }: GuideVideoProps) {
  return (
    <figure
      className="overflow-hidden rounded-3xl border-2"
      style={{
        background: 'rgba(255, 255, 255, 0.7)',
        borderColor: 'rgba(44, 62, 107, 0.18)',
      }}
    >
      <div className="flex items-center justify-between px-4 pt-3">
        <span
          className="text-[10px] font-bold tracking-[0.25em] uppercase"
          style={{
            color: 'var(--color-ink-3, rgba(44, 62, 107, 0.6))',
            fontFamily: 'var(--font-display)',
          }}
        >
          Rehber Video
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase"
          style={{
            background: 'rgba(242, 201, 76, 0.25)',
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Sessiz · Döngü
        </span>
      </div>
      <div className="relative mt-2 aspect-[4/3] w-full overflow-hidden bg-neutral-950">
        <video
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={label}
          className="absolute inset-0 h-full w-full object-contain"
        />
      </div>
      <figcaption className="px-4 pt-2 pb-3">
        <p
          className="text-sm font-black"
          style={{
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          {label}
        </p>
        {caption && (
          <p
            className="mt-1 text-xs leading-relaxed"
            style={{ color: 'var(--color-ink-2, rgba(44, 62, 107, 0.75))' }}
          >
            {caption}
          </p>
        )}
      </figcaption>
    </figure>
  );
}
