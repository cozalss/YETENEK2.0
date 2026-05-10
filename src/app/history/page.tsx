/**
 * Geçmiş test sessionları sayfası.
 *
 * localStorage'dan history listesi okunur. Her giriş özet kart olarak gösterilir.
 */

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Trash2, Calendar, Trophy } from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { historyStore, type HistoryEntry } from '@/lib/history/store';

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEntries(historyStore.list());
    setHydrated(true);
  }, []);

  const remove = (id: string) => {
    historyStore.remove(id);
    setEntries(historyStore.list());
  };

  const clearAll = () => {
    if (!confirm('Tüm geçmiş silinsin mi? Bu işlem geri alınamaz.')) return;
    historyStore.clear();
    setEntries([]);
  };

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink-1)]">
      <SiteHeader />

      <div className="mx-auto max-w-5xl px-6 pt-12 pb-20 md:px-12 md:pt-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink-1)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Ana sayfa
        </Link>

        <header className="mt-10 max-w-3xl space-y-5">
          <p className="text-xs font-semibold tracking-[0.25em] text-[var(--color-signal)] uppercase">
            Geçmişim
          </p>
          <h1 className="text-5xl leading-[0.95] font-bold tracking-tight md:text-7xl">
            Tüm <span className="text-[var(--color-signal)]">testlerin.</span>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-[var(--color-ink-2)]">
            Tamamladığın test session'ları cihazında saklanır — sunucuya
            gitmez. İstediğinde sil, özetini burada gör.
          </p>
        </header>

        {!hydrated ? (
          <div className="mt-16 rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-12 text-center text-[var(--color-ink-3)]">
            Yükleniyor…
          </div>
        ) : entries.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="mt-12 flex items-center justify-between">
              <p className="text-sm text-[var(--color-ink-2)]">
                Toplam <strong>{entries.length}</strong> tamamlanmış test
              </p>
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-2 rounded-full border border-red-500/30 px-4 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/10 focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)] focus-visible:outline-none"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hepsini Sil
              </button>
            </div>

            <ul className="mt-6 space-y-3">
              {entries.map((entry) => (
                <HistoryCard
                  key={entry.id}
                  entry={entry}
                  onRemove={() => remove(entry.id)}
                />
              ))}
            </ul>
          </>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}

function HistoryCard({
  entry,
  onRemove,
}: {
  entry: HistoryEntry;
  onRemove: () => void;
}) {
  const session = entry.session;
  const top = session.recommendations?.[0];
  const date = new Date(entry.archivedAt);
  const dateLabel = date.toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const completedCount = session.completedTests.length;

  return (
    <li className="flex items-center gap-5 rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--color-canvas)] ring-1 ring-[var(--color-signal)]/30">
        <Trophy className="h-6 w-6 text-[var(--color-signal)]" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-3">
          <h3 className="text-lg font-bold text-[var(--color-ink-1)]">
            {session.child.name} · {session.child.ageYears} yaş
          </h3>
          {top && (
            <span className="font-mono rounded-full bg-[var(--color-signal)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--color-signal)]">
              {top.sport} · %{top.confidencePercent}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-3 text-xs text-[var(--color-ink-3)]">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {dateLabel}
          </span>
          <span>·</span>
          <span>
            {completedCount} test tamamlandı
          </span>
          {session.injuryWarnings.length > 0 && (
            <>
              <span>·</span>
              <span className="text-amber-400">
                {session.injuryWarnings.length} uyarı
              </span>
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label="Bu kaydı sil"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--color-line)] text-[var(--color-ink-3)] transition-colors hover:border-red-500/40 hover:text-red-300 focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)] focus-visible:outline-none"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="grain mt-16 rounded-3xl border border-[var(--color-signal)]/30 bg-gradient-to-br from-[var(--color-signal)]/10 via-[var(--color-canvas)] to-[var(--color-surface)] p-12 text-center">
      <div className="text-4xl">📁</div>
      <h2 className="mt-4 text-2xl font-bold md:text-3xl">
        Henüz test geçmişin yok
      </h2>
      <p className="mx-auto mt-3 max-w-md text-base text-[var(--color-ink-2)]">
        İlk testini tamamladığında burada listelenir. Tüm geçmiş cihazında
        kalır, istediğinde silebilirsin.
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
