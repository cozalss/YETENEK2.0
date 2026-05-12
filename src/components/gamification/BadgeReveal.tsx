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
    <section
      className="rounded-3xl border-2 p-6"
      style={{
        background:
          'linear-gradient(135deg, rgba(242, 201, 76, 0.18) 0%, var(--color-surface-elevated) 100%)',
        borderColor: 'var(--track-mustard)',
      }}
    >
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h3
          className="text-lg font-black md:text-xl"
          style={{
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          {headline}
        </h3>
        {totalUnlocked != null && totalUnlocked > 0 && (
          <button
            type="button"
            onClick={onWalletClick}
            className="text-xs font-bold tracking-wide transition-opacity hover:opacity-70 focus-visible:underline focus-visible:outline-none"
            style={{ color: 'var(--form-navy)' }}
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
      className={`relative rounded-2xl border-2 p-4 text-center transition-all duration-500 ${
        visible
          ? 'translate-y-0 scale-100 opacity-100'
          : 'translate-y-2 scale-90 opacity-0'
      }`}
      style={{
        background: 'var(--color-surface-elevated)',
        borderColor: isNew
          ? 'var(--track-mustard)'
          : 'var(--color-line)',
      }}
    >
      {isNew && (
        <span
          className="absolute -top-2 -right-2 rounded-full px-2 py-0.5 text-[10px] font-black tracking-wider uppercase"
          style={{
            background: 'var(--track-mustard)',
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Yeni
        </span>
      )}
      <div
        className="text-4xl leading-none drop-shadow-sm"
        aria-hidden="true"
      >
        {badge.emoji}
      </div>
      <div
        className="mt-2 text-sm font-black"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        {badge.name}
      </div>
      <div
        className="mt-1 text-[11px] leading-snug"
        style={{ color: 'var(--color-ink-2)' }}
      >
        {badge.description}
      </div>
    </div>
  );
}
