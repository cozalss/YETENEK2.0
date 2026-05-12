'use client';

import { useEffect, useState } from 'react';
import { BadgeWallet } from '@/components/gamification/BadgeWallet';
import { StreakIndicator } from '@/components/gamification/StreakIndicator';
import type { Badge } from '@/lib/gamification/badges';
import { gamificationStore } from '@/lib/gamification/store';

export function GamificationPanel() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [recentDates, setRecentDates] = useState<string[]>([]);

  useEffect(() => {
    setBadges(gamificationStore.getAllUnlocked());
    setRecentDates(gamificationStore.getCurrentStreak().recentDates);
  }, []);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <BadgeWallet
        badges={badges}
        emptyState={
          <div>
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--color-ink-2)' }}
            >
              Henüz rozet yok. İlk test tamamlandığında burada görünür.
            </p>
            <p
              className="mt-2 text-xs"
              style={{ color: 'var(--color-ink-3)' }}
            >
              Rozetler bu cihazdaki tarayıcıda saklanır.
            </p>
          </div>
        }
      />
      <StreakIndicator recentDates={recentDates} />
    </div>
  );
}
