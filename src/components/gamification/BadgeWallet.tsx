/**
 * Kazanılan tüm rozetleri kategorilere ayırıp grid olarak gösteren cüzdan.
 * /profile sayfasında ana içerik; sonuç ekranında küçük "tüm rozetleri gör"
 * link'inden buraya gidilir.
 */

import {
  type Badge,
  type BadgeCategory,
  getBadgesByCategory,
} from '@/lib/gamification/badges';
import { BadgeCard } from './BadgeReveal';

interface Props {
  badges: Badge[];
  emptyState?: React.ReactNode;
}

const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  performance: 'Performans',
  profile: 'Spor Profili',
  general: 'Genel',
  streak: 'Süreklilik',
};

export function BadgeWallet({ badges, emptyState }: Props) {
  if (badges.length === 0) {
    return (
      <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-8 text-center">
        {emptyState ?? (
          <p className="text-neutral-400">
            Henüz rozetin yok. İlk testi tamamlayarak başla.
          </p>
        )}
      </div>
    );
  }

  const groups = getBadgesByCategory(badges);
  const orderedCategories: BadgeCategory[] = [
    'performance',
    'profile',
    'general',
    'streak',
  ];

  return (
    <div className="space-y-6">
      {orderedCategories.map((cat) => {
        const items = groups[cat];
        if (items.length === 0) return null;
        return (
          <section key={cat}>
            <h3 className="mb-3 text-sm font-semibold tracking-wider text-amber-400 uppercase">
              {CATEGORY_LABELS[cat]} ({items.length})
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {items.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} visible />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
