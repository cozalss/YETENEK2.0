/**
 * `prefers-reduced-motion` media query'sini izleyen hook.
 *
 * Vestibüler hassasiyetli, otizmli, sensori sorunlu kullanıcılar için
 * animasyon-azaltma sinyali. Hook her component'te kopya edilmesin diye
 * tek yerde tutuldu.
 */

'use client';

import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
