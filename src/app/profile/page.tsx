'use client';

import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { gamificationStore } from '@/lib/gamification/store';
import { BADGES, type Badge } from '@/lib/gamification/badges';
import { BadgeWallet } from '@/components/gamification/BadgeWallet';
import { StreakIndicator } from '@/components/gamification/StreakIndicator';

export default function ProfilePage() {
  const [unlocked, setUnlocked] = useState<Badge[]>([]);
  const [recentDates, setRecentDates] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUnlocked(gamificationStore.getAllUnlocked());
    setRecentDates(gamificationStore.getCurrentStreak().recentDates);
    setHydrated(true);
  }, []);

  const totalBadges = Object.keys(BADGES).length;
  const completionPercent = Math.round(
    (unlocked.length / totalBadges) * 100
  );

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink-1)]">
      <ProfileHeader />

      <div className="mx-auto max-w-6xl px-6 pb-16 pt-12 md:px-12 md:pt-20">
        <header className="space-y-4">
          <p className="eyebrow">Cüzdan</p>
          <h1 className="headline-display max-w-3xl">
            Topladığın
            <br />
            <span className="text-[var(--color-signal)]">rozetler.</span>
          </h1>
          <p className="max-w-2xl text-lg text-[var(--color-ink-2)]">
            Her test seni bir adım ileriye taşır. Farklı yönlerin geliştikçe
            yeni rozetler kazanırsın.
          </p>
        </header>

        {hydrated ? (
          <>
            <section className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat
                label="Rozet"
                value={`${unlocked.length}`}
                sub={`/ ${totalBadges} toplam`}
              />
              <Stat
                label="Tamamlanmışlık"
                value={`%${completionPercent}`}
                sub="Cüzdan doluluğu"
              />
              <Stat
                label="Son 14 gün"
                value={`${recentDates.length}`}
                sub="Test yapılan gün"
              />
            </section>

            {unlocked.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <section className="mt-16">
                  <h2 className="mb-6 text-2xl font-bold md:text-3xl">
                    Cüzdan
                  </h2>
                  <BadgeWallet badges={unlocked} />
                </section>

                <section className="mt-16">
                  <h2 className="mb-6 text-2xl font-bold md:text-3xl">
                    Süreklilik
                  </h2>
                  <StreakIndicator recentDates={recentDates} />
                </section>
              </>
            )}
          </>
        ) : (
          <div className="mt-16 rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-12 text-center text-[var(--color-ink-3)]">
            Yükleniyor…
          </div>
        )}
      </div>
    </main>
  );
}

function ProfileHeader() {
  return (
    <header className="border-b border-[var(--color-line)] bg-[var(--color-canvas)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink-1)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Ana sayfa
        </Link>
        <Link
          href="/test/full"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--color-signal)] px-4 text-sm font-semibold text-[var(--color-canvas)] transition-colors hover:bg-amber-300"
        >
          <Plus className="h-4 w-4" />
          Yeni Test
        </Link>
      </div>
    </header>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
      <div className="text-xs font-semibold tracking-wider text-[var(--color-signal)] uppercase">
        {label}
      </div>
      <div className="font-display mt-2 text-4xl font-bold tracking-tight md:text-5xl">
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-sm text-[var(--color-ink-3)]">{sub}</div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grain mt-16 rounded-3xl border border-[var(--color-signal)]/30 bg-gradient-to-br from-[var(--color-signal)]/10 via-[var(--color-canvas)] to-[var(--color-surface)] p-12 text-center">
      <div className="text-4xl">🌱</div>
      <h3 className="mt-4 text-2xl font-bold md:text-3xl">
        İlk rozeti seni bekliyor
      </h3>
      <p className="mx-auto mt-3 max-w-md text-base text-[var(--color-ink-2)]">
        Hemen 5 dakikalık tam akışı tamamla. İlk testte bile birkaç rozet
        kazanırsın.
      </p>
      <Link
        href="/test/full"
        className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-[var(--color-signal)] px-6 font-bold text-[var(--color-canvas)] transition-colors hover:bg-amber-300"
      >
        Tam Akışa Başla
      </Link>
    </div>
  );
}
