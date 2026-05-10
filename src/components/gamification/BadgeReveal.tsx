/**
 * Sonuç ekranında kazanılan rozetlerin animasyonlu açılışı.
 *
 * Demo'da pitch kazanan an: çocuk testi bitirir, ekrana 3-5 rozet
 * sırayla "tutkun" şeklinde gelir, çocuğun gözü parlar, jüri etkilenir.
 *
 * Tasarım:
 *   - Rozet kartı: emoji + isim + açıklama
 *   - Açılış animasyonu: scale(0.7→1) + opacity(0→1) + bounce
 *   - Stagger: rozetler 250ms aralıklarla görünür
 *   - "Yeni" etiketi: ilk kez kazanılan rozetlerde amber rozet
 */

'use client';

import { useEffect, useState } from 'react';
import type { Badge } from '@/lib/gamification/badges';

interface Props {
  newlyUnlocked: Badge[];
  totalUnlocked?: number;
  onWalletClick?: () => void;
}

export function BadgeReveal({
  newlyUnlocked,
  totalUnlocked,
  onWalletClick,
}: Props) {
  const [visibleCount, setVisibleCount] = useState(0);

  // Stagger reveal: her rozet 250ms sonra görünür
  useEffect(() => {
    if (newlyUnlocked.length === 0) return;
    setVisibleCount(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < newlyUnlocked.length; i++) {
      timers.push(
        setTimeout(() => setVisibleCount((c) => c + 1), 200 + i * 250)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [newlyUnlocked]);

  if (newlyUnlocked.length === 0) {
    return null;
  }

  const headline =
    newlyUnlocked.length === 1
      ? '🎉 Yeni rozet kazandın!'
      : `🎉 ${newlyUnlocked.length} yeni rozet kazandın!`;

  return (
    <section className="rounded-3xl border border-amber-400/40 bg-gradient-to-br from-amber-400/10 via-neutral-950 to-neutral-900 p-6">
      <div className="mb-5 flex items-baseline justify-between">
        <h3 className="text-lg font-bold text-amber-400 md:text-xl">
          {headline}
        </h3>
        {totalUnlocked != null && totalUnlocked > 0 && (
          <button
            type="button"
            onClick={onWalletClick}
            className="text-xs font-medium text-amber-300/80 hover:text-amber-300 focus-visible:underline focus-visible:outline-none"
          >
            Tüm rozetleri gör ({totalUnlocked}) →
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {newlyUnlocked.map((badge, idx) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            visible={idx < visibleCount}
            isNew
          />
        ))}
      </div>
    </section>
  );
}

interface BadgeCardProps {
  badge: Badge;
  visible: boolean;
  isNew?: boolean;
}

export function BadgeCard({ badge, visible, isNew = false }: BadgeCardProps) {
  return (
    <div
      className={`relative rounded-2xl border bg-neutral-900/60 p-4 text-center transition-all duration-500 ${
        visible
          ? 'translate-y-0 scale-100 opacity-100'
          : 'translate-y-2 scale-90 opacity-0'
      } ${isNew ? 'border-amber-400/50' : 'border-neutral-800'}`}
    >
      {isNew && (
        <span className="absolute -top-2 -right-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold tracking-wider text-neutral-950 uppercase">
          Yeni
        </span>
      )}
      <div
        className="text-4xl leading-none drop-shadow-md"
        aria-hidden="true"
      >
        {badge.emoji}
      </div>
      <div className="mt-2 text-sm font-bold text-white">{badge.name}</div>
      <div className="mt-1 text-[11px] leading-snug text-neutral-400">
        {badge.description}
      </div>
    </div>
  );
}
