'use client';

/**
 * Service worker register'ı — PWA "Yükle" prompt'u + offline mod için.
 *
 * Sadece production'da kayıt olur — dev modunda Turbopack HMR cache'lenmesi
 * "neden hâlâ eski kod görüyorum" sorunu çıkarır.
 *
 * Tarayıcı SW'yi desteklemiyorsa (eski Safari, in-app webview) sessizce
 * pas geçer — ana akış zaten çalışıyor.
 */

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          // Sessizce yut — SW olmaması ana akışı kırmaz.
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[SW] register başarısız:', err);
          }
        });
    };

    if (document.readyState === 'complete') {
      onLoad();
    } else {
      window.addEventListener('load', onLoad);
      return () => window.removeEventListener('load', onLoad);
    }
  }, []);

  return null;
}
