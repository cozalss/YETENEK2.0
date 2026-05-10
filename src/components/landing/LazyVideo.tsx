'use client';

/**
 * LazyVideo
 *
 * Yetenek 2.0 landing'inde 22 dekoratif video aynı anda decode edildiği için
 * cihaz kasıyordu. Bu bileşen:
 *
 * 1. Sadece viewport'a yakın (rootMargin 200px) olunca video kaynağını yükler
 *    (preload="metadata" → "auto") ve play() çağırır.
 * 2. Görünmediğinde pause() — decode'u bırakıp ana iş parçacığını rahatlatır.
 * 3. `eager` prop'u tek istisna olan hero video için autoplay öncelik verir.
 *
 * IntersectionObserver yaklaşımı web.dev "lazy-loading-video" rehberindeki
 * desenle uyumlu, görsel davranış değişmez (otomatik oyun + loop + muted).
 */

import {
  useEffect,
  useRef,
  type Ref,
  type VideoHTMLAttributes,
} from 'react';

interface LazyVideoProps
  extends Omit<VideoHTMLAttributes<HTMLVideoElement>, 'src' | 'children'> {
  src: string;
  /** Hero gibi ilk-fold videoları için kaynağı hemen yükler ve oynatır. */
  eager?: boolean;
  /** Görünür alana ne kadar yakınken oynatılmaya başlasın? */
  rootMargin?: string;
  /** Dış ref'i element ile birleştirmek için. */
  ref?: Ref<HTMLVideoElement>;
}

export function LazyVideo({
  src,
  eager = false,
  rootMargin = '500px 0px',
  className,
  style,
  poster,
  ref: externalRef,
  ...rest
}: LazyVideoProps) {
  const internalRef = useRef<HTMLVideoElement>(null);

  const setRef = (node: HTMLVideoElement | null) => {
    internalRef.current = node;
    if (typeof externalRef === 'function') {
      externalRef(node);
    } else if (externalRef && 'current' in externalRef) {
      (externalRef as { current: HTMLVideoElement | null }).current = node;
    }
  };

  useEffect(() => {
    const el = internalRef.current;
    if (!el) return;

    const safePlay = () => {
      const promise = el.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch(() => {
          /* autoplay engellendi — sessizce yut */
        });
      }
    };

    if (eager) {
      safePlay();
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: preload'u aç ve oynat.
      if (el.preload !== 'auto') el.preload = 'auto';
      safePlay();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // İlk kez görünür olunca preload="none" → "auto"; play() tetiklenince
            // browser sadece bu noktada gerekli byte'ları çekmeye başlar.
            if (el.preload !== 'auto') el.preload = 'auto';
            safePlay();
          } else if (!el.paused) {
            el.pause();
          }
        }
      },
      { rootMargin, threshold: 0 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [eager, rootMargin]);

  return (
    <video
      ref={setRef}
      muted
      loop
      playsInline
      // Eager olmayan videolar ilk yüklemede HİÇBİR HTTP isteği başlatmaz.
      // Sadece viewport yakınına gelince preload "auto"ya çekilir.
      preload={eager ? 'auto' : 'none'}
      poster={poster}
      className={className}
      style={style}
      {...rest}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
