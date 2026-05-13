/**
 * Giriş sayfası — login_page tasarımı entegre edildi.
 *
 * Tasarım: Manrope tipografi, grid-li atmosfer, mix-blend karakterler,
 * cam-effect form kartı, rainbow CTA. Server action'lar değişmedi —
 * Supabase auth (email + Google OAuth) korundu.
 *
 * Visual kart `.signin-form` ile stil alır ama iki ayrı `<form>` içerir
 * (email/password ve Google — farklı server action'lara submit).
 */

import Link from 'next/link';
import {
  signInWithEmailAction,
  signInWithGoogleAction,
} from '@/app/auth/actions';
import { env } from '@/shared/config/env-public';
import { SiteHeader } from '@/components/layout/SiteHeader';
import './sign-in.css';

interface PageProps {
  searchParams: Promise<{
    next?: string;
    error?: string;
    info?: string;
  }>;
}

export default async function SignInPage({ searchParams }: PageProps) {
  const { next, error, info } = await searchParams;

  if (!env.isSupabaseConfigured) {
    return <UnconfiguredCard />;
  }

  const signUpHref = `/auth/sign-up${next ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <div className="signin-scope">
      <div className="signin-header-wrap">
        <SiteHeader />
      </div>

      <div className="signin-grid-bg" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/login/grid.svg" alt="" />
      </div>

      <main className="signin-screen">
        <video
          className="signin-character signin-character--1"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/login/character1.mp4" type="video/mp4" />
        </video>
        <video
          className="signin-character signin-character--2"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/login/character2.mp4" type="video/mp4" />
        </video>

        <section className="signin-wrap">
          <header className="signin-head">
            <h1>
              Welcome
              <br />
              <span className="signin-head-bold">
                back
                <span className="signin-sparkle" aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/login/star.svg" alt="" width={22} height={22} />
                </span>
              </span>
            </h1>
            <p className="signin-subtitle">
              Log in to continue
              <br />
              where you left off.
            </p>
          </header>

          <div className="signin-form">
            {error && (
              <div className="signin-alert signin-alert--error" role="alert">
                {error}
              </div>
            )}
            {info && (
              <div className="signin-alert signin-alert--info" role="status">
                {info}
              </div>
            )}

            <form
              action={signInWithEmailAction}
              noValidate
              className="signin-form-inner"
            >
              {next && <input type="hidden" name="next" value={next} />}

              <label className="signin-field">
                <span className="signin-field-label">Email</span>
                <input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="signin-field">
                <span className="signin-field-label">Password</span>
                <input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </label>

              <button type="submit" className="signin-cta">
                <span className="signin-cta-icon">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/login/button.svg" alt="" width={20} height={20} />
                </span>
                Log in
              </button>
            </form>

            <div className="signin-divider">
              <span>or</span>
            </div>

            <form action={signInWithGoogleAction}>
              {next && <input type="hidden" name="next" value={next} />}
              <button type="submit" className="signin-google">
                <GoogleIcon />
                Continue with Google
              </button>
            </form>

            <p className="signin-signup-line">
              New to YETENEK 2.0?{' '}
              <Link href={signUpHref}>Create an account</Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function UnconfiguredCard() {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-12"
      style={{ background: 'var(--whistle-cream)' }}
    >
      <section
        className="w-full max-w-md rounded-3xl border-2 p-8 text-center"
        style={{
          background: '#fff',
          borderColor: 'var(--track-mustard)',
        }}
      >
        <h1
          className="text-xl font-black"
          style={{
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Auth servisi yapılandırılmamış
        </h1>
        <p
          className="mt-3 text-sm"
          style={{ color: 'var(--form-navy)', opacity: 0.7 }}
        >
          Geliştirici: <code>.env.local</code>&apos;a{' '}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> ve{' '}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> ekleyin.
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
          Anasayfaya dön
        </Link>
      </section>
    </main>
  );
}
