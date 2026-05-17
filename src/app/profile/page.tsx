/**
 * Veli profil sayfası — çocuk listesi + cüzdan/streak.
 *
 * Auth zorunlu (middleware redirect eder). Server-rendered child list +
 * inline "çocuk ekle" formu. Çocuk kartlarına tıklayınca `/children/[id]`
 * detay sayfasına geçilir; rozet/geçmiş/streak orada per-child gösterilir.
 */

import Link from 'next/link';
import { ArrowLeft, LogOut } from 'lucide-react';
import { getCachedUser } from '@/lib/auth/get-cached-user';
import { supabaseChildRepository } from '@/infrastructure/storage/supabase-child-repository';
import { supabaseLessonRepository } from '@/infrastructure/storage/supabase-lesson-repository';
import { env } from '@/shared/config/env-public';
import { signOutAction } from '@/app/auth/actions';
import { ChildrenSection } from './ChildrenSection';

interface PageProps {
  searchParams: Promise<{ error?: string; info?: string }>;
}

function deriveProfileDisplayName(
  metadata: Record<string, unknown> | null | undefined,
  email: string | null | undefined
): string {
  if (metadata) {
    const fullName = metadata['full_name'];
    if (typeof fullName === 'string' && fullName.trim().length > 0) {
      return fullName.trim();
    }
    const displayName = metadata['displayName'];
    if (typeof displayName === 'string' && displayName.trim().length > 0) {
      return displayName.trim();
    }
  }
  if (email && email.includes('@')) {
    return email.split('@')[0];
  }
  return 'veli';
}

export default async function ProfilePage({ searchParams }: PageProps) {
  const { error, info } = await searchParams;

  // Auth yapılandırılmamışsa demo modunda dur — kullanıcıya bilgilendir.
  if (!env.isSupabaseConfigured) {
    return <UnconfiguredView />;
  }

  const user = await getCachedUser();

  // Middleware zaten redirect ediyor ama defensive:
  if (!user) {
    return <UnauthView />;
  }

  // İki bağımsız fetch paralel çalışır — sıralı await yerine ~50-150ms kazanç.
  const [childrenResult, enrollmentsResult] = await Promise.all([
    supabaseChildRepository.list(),
    supabaseLessonRepository.listEnrollmentsForUser(),
  ]);
  const children = childrenResult.ok ? childrenResult.value : [];

  // Her çocuğun aktif spor kaydını çek; ChildrenSection bunları küçük rozet
  // olarak gösterebilir. Kart detayında full progress var.
  const enrollmentsByChild = new Map<string, string>();
  if (enrollmentsResult.ok) {
    for (const e of enrollmentsResult.value) {
      enrollmentsByChild.set(e.childId, e.sportSlug);
    }
  }

  // Asla ham e-posta gösterme — full_name → displayName → email-localpart sırası.
  // Demo hesabı için metadata.displayName = 'Demo Veli' set edilmişti; gerçek
  // sign-up'tan gelen veliler için metadata.full_name dolu olur.
  const displayName = deriveProfileDisplayName(user.user_metadata, user.email);

  return (
    <main
      className="min-h-screen"
      style={{
        background: 'var(--whistle-cream)',
        color: 'var(--form-navy)',
      }}
    >
      <ProfileHeader email={user.email ?? ''} displayName={displayName} />

      <div className="mx-auto max-w-6xl px-6 pt-10 pb-16 md:px-12 md:pt-16">
        <header className="space-y-3">
          <p
            className="text-xs font-bold tracking-[0.3em] uppercase"
            style={{ color: 'var(--track-mustard)' }}
          >
            Veli paneli
          </p>
          <h1
            className="text-4xl font-black md:text-5xl"
            style={{
              color: 'var(--form-navy)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Merhaba {displayName.split(' ')[0] || 'veli'}!
          </h1>
          <p
            className="max-w-2xl text-base md:text-lg"
            style={{ color: 'var(--form-navy)', opacity: 0.75 }}
          >
            Çocuklarını ekle, her birinin yetenek profilini ayrı ayrı oluştur.
            Her test çocuğa özel kaydedilir, geçmişi takip edebilirsin.
          </p>
        </header>

        {error && (
          <div
            className="mt-6 rounded-xl border p-3 text-sm"
            style={{
              background: 'rgba(244, 182, 194, 0.2)',
              borderColor: 'var(--mindar-pink)',
              color: 'var(--deep-navy)',
            }}
            role="alert"
          >
            {error}
          </div>
        )}
        {info && (
          <div
            className="mt-6 rounded-xl border p-3 text-sm"
            style={{
              background: 'rgba(168, 213, 186, 0.25)',
              borderColor: 'var(--field-mint)',
              color: 'var(--deep-navy)',
            }}
            role="status"
          >
            {info}
          </div>
        )}

        <ChildrenSection
          items={children}
          enrollmentsByChild={enrollmentsByChild}
        />

        <section
          className="mt-12 rounded-2xl border-2 p-5 text-sm"
          style={{
            background: 'rgba(168, 213, 186, 0.12)',
            borderColor: 'var(--field-mint)',
            color: 'var(--deep-navy)',
          }}
        >
          <strong>İpucu.</strong> Her çocuğun rozet cüzdanı, test geçmişi ve
          sürekliliği kendi sayfasında durur. Yukarıdaki kartlardan birine
          tıklayarak detayı aç.
        </section>
      </div>
    </main>
  );
}

function ProfileHeader({
  email,
  displayName,
}: {
  email: string;
  displayName: string;
}) {
  return (
    <header
      className="border-b-2"
      style={{
        background: 'var(--whistle-cream)',
        borderColor: 'rgba(44, 62, 107, 0.1)',
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5 md:px-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold"
          style={{
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          YETENEK
        </Link>
        <div className="flex items-center gap-4">
          <div className="hidden text-right md:block">
            <div
              className="text-sm font-bold"
              style={{ color: 'var(--form-navy)' }}
            >
              {displayName}
            </div>
            <div
              className="text-xs"
              style={{ color: 'var(--form-navy)', opacity: 0.6 }}
            >
              {email}
            </div>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors hover:bg-neutral-50"
              style={{
                borderColor: 'var(--form-navy)',
                color: 'var(--form-navy)',
                fontFamily: 'var(--font-display)',
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
              Çıkış
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

function UnconfiguredView() {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-12"
      style={{ background: 'var(--whistle-cream)' }}
    >
      <section
        className="w-full max-w-md rounded-3xl border-2 p-8 text-center"
        style={{ background: '#fff', borderColor: 'var(--track-mustard)' }}
      >
        <h1
          className="text-xl font-black"
          style={{
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Profil servisi yapılandırılmamış
        </h1>
        <p
          className="mt-3 text-sm"
          style={{ color: 'var(--form-navy)', opacity: 0.7 }}
        >
          Geliştirici: <code>.env.local</code>'a Supabase URL ve anon-key
          ekleyin.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full px-5 py-2 text-sm font-bold"
          style={{
            background: 'var(--track-mustard)',
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Anasayfa
        </Link>
      </section>
    </main>
  );
}

function UnauthView() {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-12"
      style={{ background: 'var(--whistle-cream)' }}
    >
      <section
        className="w-full max-w-md rounded-3xl border-2 p-8 text-center"
        style={{ background: '#fff', borderColor: 'var(--form-navy)' }}
      >
        <h1
          className="text-xl font-black"
          style={{
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Önce hesap aç
        </h1>
        <p
          className="mt-3 text-sm"
          style={{ color: 'var(--form-navy)', opacity: 0.7 }}
        >
          Çocuğunun yetenek profilini oluşturmak için ücretsiz veli hesabı aç.
          30 saniye, e-posta yeterli.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/auth/sign-up?next=/profile"
            className="rounded-full px-5 py-2.5 text-sm font-bold tracking-widest uppercase"
            style={{
              background: 'var(--track-mustard)',
              color: 'var(--form-navy)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Kayıt Ol
          </Link>
          <Link
            href="/auth/sign-in?next=/profile"
            className="rounded-full border-2 px-5 py-2 text-xs font-bold tracking-widest uppercase"
            style={{
              borderColor: 'var(--form-navy)',
              color: 'var(--form-navy)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Zaten hesabım var
          </Link>
        </div>
      </section>
    </main>
  );
}
