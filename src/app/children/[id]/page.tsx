/**
 * Çocuk detay sayfası — kart'a tıklayınca buraya geliniyor.
 *
 * Görünüm (top → bottom):
 *   1. Header: avatar + ad + yaş + Sil butonu
 *   2. Yeni Test CTA (Tam Akış / Hızlı 3) + son test özeti
 *   3. Cüzdan (bu çocuğun rozetleri) + boşsa hint
 *   4. Test Geçmişi (en son 5 oturum, "tümü" linki)
 *   5. Süreklilik (14 günlük streak rozeti)
 *
 * Hepsi server-side: child-progress view tek query'de özet, badges +
 * sessions ayrı paralel query.
 */

import Link from 'next/link';
import { ArrowLeft, Calendar, Plus, Trash2 } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { supabaseChildRepository } from '@/infrastructure/storage/supabase-child-repository';
import { supabaseChildProgressRepository } from '@/infrastructure/storage/supabase-child-progress-repository';
import { removeChildAction } from '@/app/children/actions';
import { BADGES } from '@/lib/gamification/badges';
import { makeChildId } from '@/core/types/branded';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; info?: string }>;
}

export default async function ChildDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { error, info } = await searchParams;

  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Middleware zaten redirect ediyor ama defensive
    return null;
  }

  const childId = makeChildId(id);
  const [childResult, badgesResult, sessionsResult, summaryResult] =
    await Promise.all([
      supabaseChildRepository.get(childId),
      supabaseChildProgressRepository.listBadges(childId),
      supabaseChildProgressRepository.listSessions(childId, 5),
      supabaseChildProgressRepository.getSummary(childId),
    ]);

  if (!childResult.ok) {
    if (childResult.error.kind === 'not-found') return notFound();
    throw new Error('Çocuk getirilemedi: ' + childResult.error.kind);
  }
  const child = childResult.value;
  const badges = badgesResult.ok ? badgesResult.value : [];
  const sessions = sessionsResult.ok ? sessionsResult.value : [];
  const summary = summaryResult.ok
    ? summaryResult.value
    : { badgeCount: 0, sessionCount: 0, lastTestedAt: null, streakDays: 0, childId: id };

  return (
    <main
      className="min-h-screen pb-16"
      style={{
        background: 'var(--whistle-cream)',
        color: 'var(--form-navy)',
      }}
    >
      <DetailHeader />

      <div className="mx-auto max-w-5xl px-6 md:px-12">
        <ChildHero child={child} summary={summary} />

        {error && <Banner kind="error" text={error} />}
        {info && <Banner kind="info" text={info} />}

        <NewTestCTA childId={child.id} />

        <BadgesWallet badgeIds={badges.map((b) => b.badgeId)} />

        <SessionHistory sessions={sessions} childId={child.id} />

        <StreakBlock streakDays={summary.streakDays} />
      </div>
    </main>
  );
}

function DetailHeader() {
  return (
    <header
      className="border-b-2"
      style={{
        background: 'var(--whistle-cream)',
        borderColor: 'rgba(44, 62, 107, 0.1)',
      }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5 md:px-12">
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 text-sm font-bold"
          style={{
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Tüm çocuklar
        </Link>
      </div>
    </header>
  );
}

function ChildHero({
  child,
  summary,
}: {
  child: {
    id: string;
    displayName: string;
    ageYears: number;
    sex: 'male' | 'female';
    heightCm?: number;
    weightKg?: number;
    avatarEmoji?: string;
  };
  summary: { badgeCount: number; sessionCount: number };
}) {
  return (
    <section className="pt-10 pb-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full text-5xl shadow-inner"
            style={{ background: '#fff' }}
          >
            {child.avatarEmoji ?? (child.sex === 'female' ? '👧' : '👦')}
          </div>
          <div>
            <p
              className="text-xs font-bold uppercase tracking-[0.3em]"
              style={{ color: 'var(--track-mustard)' }}
            >
              Profil
            </p>
            <h1
              className="mt-1 text-4xl font-black md:text-5xl"
              style={{
                color: 'var(--form-navy)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {child.displayName}
            </h1>
            <p
              className="mt-1 text-sm"
              style={{ color: 'var(--form-navy)', opacity: 0.7 }}
            >
              {child.ageYears} yaş · {child.sex === 'female' ? 'kız' : 'erkek'}
              {child.heightCm ? ` · ${child.heightCm} cm` : ''}
              {child.weightKg ? ` · ${child.weightKg} kg` : ''}
            </p>
          </div>
        </div>
        <form action={removeChildAction}>
          <input type="hidden" name="id" value={child.id} />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-red-50"
            style={{
              borderColor: 'var(--mindar-pink)',
              color: 'var(--deep-navy)',
              fontFamily: 'var(--font-display)',
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Çocuğu sil
          </button>
        </form>
      </div>

      <dl className="mt-8 grid grid-cols-3 gap-3">
        <StatTile label="Rozet" value={summary.badgeCount} />
        <StatTile label="Test" value={summary.sessionCount} />
        <StatTile label="Streak" value={summary.sessionCount > 0 ? '✓' : '—'} />
      </dl>
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      className="rounded-2xl border-2 p-4"
      style={{
        background: '#fff',
        borderColor: 'rgba(44, 62, 107, 0.12)',
      }}
    >
      <div
        className="text-xs font-bold uppercase tracking-widest"
        style={{ color: 'var(--track-mustard)' }}
      >
        {label}
      </div>
      <div
        className="mt-1 text-3xl font-black"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function NewTestCTA({ childId }: { childId: string }) {
  return (
    <section className="mt-2">
      <h2 className="sr-only">Yeni test</h2>
      <div className="flex flex-col gap-3 md:flex-row">
        <Link
          href={`/test/full?childId=${encodeURIComponent(childId)}`}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-black uppercase tracking-widest transition-transform hover:scale-[1.02]"
          style={{
            background: 'var(--track-mustard)',
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
            boxShadow: '0 8px 24px rgba(242, 201, 76, 0.35)',
          }}
        >
          <Plus className="h-4 w-4" />
          Tam Akış (7 test)
        </Link>
        <Link
          href={`/test/full?childId=${encodeURIComponent(childId)}&mode=quick`}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border-2 px-6 py-3 text-sm font-bold uppercase tracking-widest transition-colors hover:bg-neutral-50"
          style={{
            borderColor: 'var(--form-navy)',
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Hızlı 3 (3 dk)
        </Link>
      </div>
    </section>
  );
}

function BadgesWallet({ badgeIds }: { badgeIds: ReadonlyArray<string> }) {
  const earned = badgeIds.map((id) => BADGES[id]).filter(Boolean);

  return (
    <section className="mt-12">
      <header className="mb-4 flex items-baseline justify-between">
        <h2
          className="text-2xl font-black md:text-3xl"
          style={{
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Cüzdan
        </h2>
        <span
          className="text-xs"
          style={{ color: 'var(--form-navy)', opacity: 0.6 }}
        >
          {earned.length} rozet
        </span>
      </header>

      {earned.length === 0 ? (
        <div
          className="rounded-3xl border-2 border-dashed p-10 text-center"
          style={{
            background: 'rgba(242, 201, 76, 0.06)',
            borderColor: 'rgba(242, 201, 76, 0.4)',
          }}
        >
          <div className="text-4xl">🌱</div>
          <p
            className="mt-3 text-sm"
            style={{ color: 'var(--form-navy)', opacity: 0.75 }}
          >
            İlk test sonrası ilk rozeti buraya düşer.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {earned.map((b) => (
            <article
              key={b.id}
              className="rounded-2xl border-2 p-4 text-center"
              style={{
                background: '#fff',
                borderColor: 'rgba(242, 201, 76, 0.45)',
              }}
            >
              <div className="text-3xl">{b.emoji}</div>
              <h3
                className="mt-2 text-sm font-bold"
                style={{
                  color: 'var(--form-navy)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {b.name}
              </h3>
              <p
                className="mt-1 text-[11px] leading-relaxed"
                style={{ color: 'var(--form-navy)', opacity: 0.65 }}
              >
                {b.description}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

interface SessionItem {
  readonly id: string;
  readonly completedAt: string | null;
  readonly summary: {
    readonly recommendations?: ReadonlyArray<{ sport: string; confidencePercent: number }>;
  };
}

function SessionHistory({
  sessions,
  childId,
}: {
  sessions: ReadonlyArray<SessionItem>;
  childId: string;
}) {
  return (
    <section className="mt-12">
      <h2
        className="mb-4 text-2xl font-black md:text-3xl"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        Test Geçmişi
      </h2>

      {sessions.length === 0 ? (
        <div
          className="rounded-3xl border-2 p-8 text-center"
          style={{
            background: '#fff',
            borderColor: 'rgba(44, 62, 107, 0.1)',
          }}
        >
          <p
            className="text-sm"
            style={{ color: 'var(--form-navy)', opacity: 0.7 }}
          >
            Henüz test yapılmamış. Yukarıdaki yeşil CTA'dan başlat.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => {
            const top = s.summary.recommendations?.[0];
            return (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-2xl border-2 px-5 py-4"
                style={{
                  background: '#fff',
                  borderColor: 'rgba(44, 62, 107, 0.1)',
                }}
              >
                <div className="flex items-center gap-3">
                  <Calendar
                    className="h-4 w-4"
                    style={{ color: 'var(--track-mustard)' }}
                  />
                  <div>
                    <div
                      className="text-sm font-bold"
                      style={{
                        color: 'var(--form-navy)',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {s.completedAt
                        ? new Date(s.completedAt).toLocaleString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Tamamlanmadı'}
                    </div>
                    {top && (
                      <div
                        className="text-xs"
                        style={{ color: 'var(--form-navy)', opacity: 0.7 }}
                      >
                        En iyi eşleşme: {top.sport} (%{top.confidencePercent})
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 text-right">
        <Link
          href={`/history?childId=${encodeURIComponent(childId)}`}
          className="text-xs font-bold uppercase tracking-widest underline"
          style={{ color: 'var(--form-navy)', opacity: 0.7 }}
        >
          Tüm geçmiş →
        </Link>
      </div>
    </section>
  );
}

function StreakBlock({ streakDays }: { streakDays: number }) {
  return (
    <section className="mt-12">
      <h2
        className="mb-4 text-2xl font-black md:text-3xl"
        style={{
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-display)',
        }}
      >
        Süreklilik (14 gün)
      </h2>
      <div
        className="rounded-3xl border-2 p-6"
        style={{
          background: '#fff',
          borderColor: 'rgba(44, 62, 107, 0.1)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="text-3xl">🔥</div>
          <div>
            <div
              className="text-3xl font-black"
              style={{
                color: 'var(--form-navy)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {streakDays} gün
            </div>
            <div
              className="text-xs"
              style={{ color: 'var(--form-navy)', opacity: 0.6 }}
            >
              Son 14 günde test yapılan benzersiz gün
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Banner({ kind, text }: { kind: 'error' | 'info'; text: string }) {
  const style =
    kind === 'error'
      ? {
          background: 'rgba(244, 182, 194, 0.2)',
          borderColor: 'var(--mindar-pink)',
        }
      : {
          background: 'rgba(168, 213, 186, 0.25)',
          borderColor: 'var(--field-mint)',
        };
  return (
    <div
      className="mb-4 rounded-xl border-2 p-3 text-sm"
      style={{
        ...style,
        color: 'var(--deep-navy)',
      }}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      {text}
    </div>
  );
}
