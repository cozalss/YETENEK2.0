/**
 * Reveal — scroll'a girdiğinde içeriği fade + slide ile açan utility.
 *
 * CSS-only + IntersectionObserver. Önceki versiyon `motion/react` (Framer
 * Motion) kullanıyordu ve sayfa boyunca her section'ı 'use client'
 * sınırına itiyordu. Bu hafif versiyon yalnız bir küçük client leaf
 * component'idir; bunu çağıran parent'lar Server Component kalır.
 *
 * Kullanım: `<Reveal>...içerik...</Reveal>` veya `<Reveal delay={120}>`.
 */

'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right' | 'fade';

interface Props {
  children: ReactNode;
  /** Animasyon başlangıç gecikmesi (ms). */
  delay?: number;
  /** Geçiş süresi (ms). Default 700ms. */
  duration?: number;
  from?: Direction;
  className?: string;
  /** `true` ise sadece ilk girişte oynar (default). */
  once?: boolean;
}

const transformMap: Record<Direction, string> = {
  up: 'translateY(24px)',
  down: 'translateY(-24px)',
  left: 'translateX(24px)',
  right: 'translateX(-24px)',
  fade: 'none',
};

export function Reveal({
  children,
  delay = 0,
  duration = 700,
  from = 'up',
  className,
  once = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // prefers-reduced-motion → animasyonsuz, anında görünür.
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  const style: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : transformMap[from],
    transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
    willChange: visible ? 'auto' : 'opacity, transform',
  };

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
