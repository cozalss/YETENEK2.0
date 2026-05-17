/**
 * Landing rozet vitrini — gerçek 36 rozet (emoji + isim + kazanma kriteri).
 *
 * İlk gösterimde sadece 8 rozet (öne çıkanlar) görünür → "Tümünü Göster"
 * butonu kalanı kategoriye göre gruplayıp expand eder. Sayfayı boğmasın diye.
 */

'use client';

import { useState } from 'react';
import { BADGES, type Badge } from '@/lib/gamification/badges';

// 8 öne çıkan rozet — landing için hızlı bir tat. Tüm tip çeşidi temsil edilsin.
const FEATURED_IDS = [
  'firstStep',
  'fullScreening',
  'champion',
  'lightning',
  'rocketBack',
  'volleyballStar',
  'dailyHero',
  'firstLesson',
] as const;

const CATEGORY_LABEL: Record<string, string> = {
  general: 'Genel',
  performance: 'Performans',
  profile: 'Spor Profili',
  streak: 'Süreklilik',
};

const CATEGORY_ORDER: Record<string, number> = {
  general: 0,
  performance: 1,
  profile: 2,
  streak: 3,
};

export function BadgesShowcaseLanding() {
  const [expanded, setExpanded] = useState(false);

  const all = Object.values(BADGES);
  const featured = FEATURED_IDS.map((id) => BADGES[id]).filter(Boolean);
  const remainingCount = all.length - featured.length;

  // Expand'lendiğinde kategori başlıklı tam vitrin
  const byCategory = new Map<string, Badge[]>();
  for (const b of all) {
    const arr = byCategory.get(b.category) ?? [];
    arr.push(b);
    byCategory.set(b.category, arr);
  }
  const categorySections = [...byCategory.entries()].sort(
    (a, b) => (CATEGORY_ORDER[a[0]] ?? 99) - (CATEGORY_ORDER[b[0]] ?? 99)
  );

  return (
    <div>
      <h3
        className="mb-6 text-center text-sm font-bold tracking-[0.2em] uppercase lg:text-left"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        KAZANILABİLECEK ROZETLER ({all.length})
      </h3>

      {/* Öne çıkan 8 rozet — her zaman görünür */}
      <div className="grid grid-cols-4 gap-3">
        {featured.map((b) => (
          <BadgeCard key={b.id} badge={b} />
        ))}
      </div>

      {/* Expand edilince kategoriye göre tüm rozetler */}
      {expanded && (
        <div className="mt-8 space-y-6">
          {categorySections.map(([cat, items]) => (
            <div key={cat}>
              <h4
                className="mb-3 text-[11px] font-bold tracking-[0.25em] uppercase"
                style={{
                  color: 'var(--form-navy)',
                  opacity: 0.6,
                  fontFamily: 'var(--font-display)',
                }}
              >
                {CATEGORY_LABEL[cat] ?? cat} · {items.length}
              </h4>
              <div className="grid grid-cols-4 gap-3">
                {items.map((b) => (
                  <BadgeCard key={b.id} badge={b} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 px-5 py-2.5 text-xs font-bold tracking-[0.2em] uppercase transition-colors hover:bg-white/40"
        style={{
          borderColor: 'rgba(44, 62, 107, 0.35)',
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
        aria-expanded={expanded}
      >
        {expanded ? 'Daha Az Göster' : `Tümünü Göster (${remainingCount} daha)`}
      </button>
    </div>
  );
}

function BadgeCard({ badge }: { badge: Badge }) {
  return (
    <div
      className="flex cursor-pointer flex-col items-center rounded-xl p-3 transition-all duration-300 hover:scale-[1.06]"
      style={{
        background: 'rgba(255, 245, 225, 0.6)',
        backdropFilter: 'blur(8px)',
        border: '2px solid rgba(44, 62, 107, 0.15)',
      }}
      title={`${badge.name}: ${badge.earnedFor}`}
    >
      <div
        className="mb-2 flex h-11 w-11 items-center justify-center rounded-full text-xl"
        style={{ background: 'rgba(242, 201, 76, 0.35)' }}
        aria-hidden="true"
      >
        {badge.emoji}
      </div>
      <span
        className="text-center text-[9px] leading-tight tracking-wider uppercase"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
        }}
      >
        {badge.name}
      </span>
    </div>
  );
}
