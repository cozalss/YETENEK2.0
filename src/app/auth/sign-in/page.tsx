/**
 * Giriş sayfası — email + parola veya Google OAuth.
 *
 * Server Action submission: middleware authed user'ı `/profile`'a
 * yönlendirir, bu sayfa sadece anon kullanıcılar için.
 *
 * Tema: landing paleti (cream zemin, navy ink, mustard accent).
 */

import Link from 'next/link';
import {
  signInWithEmailAction,
  signInWithGoogleAction,
} from '@/app/auth/actions';
import { env } from '@/shared/config/env-public';

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

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-12"
      style={{ background: 'var(--whistle-cream)' }}
    >
      <section
        className="w-full max-w-md rounded-3xl border-2 p-8 shadow-xl"
        style={{
          background: '#fff',
          borderColor: 'var(--form-navy)',
          boxShadow: '0 20px 60px rgba(44, 62, 107, 0.12)',
        }}
      >
        <header className="mb-8 text-center">
          <Link
            href="/"
            className="inline-block text-lg font-black tracking-[0.3em]"
            style={{
              color: 'var(--form-navy)',
              fontFamily: 'var(--font-display)',
            }}
          >
            YETENEK
          </Link>
          <div
            className="mx-auto mt-4 h-[2px] w-12"
            style={{ background: 'var(--track-mustard)' }}
          />
          <h1
            className="mt-6 text-2xl font-black"
            style={{
              color: 'var(--form-navy)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Hoş geldin
          </h1>
          <p
            className="mt-2 text-sm"
            style={{
              color: 'var(--form-navy)',
              opacity: 0.7,
              fontFamily: 'var(--font-body)',
            }}
          >
            Çocuğunun yeteneklerini birlikte keşfedelim.
          </p>
        </header>

        {error && (
          <div
            className="mb-4 rounded-xl border p-3 text-sm"
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
            className="mb-4 rounded-xl border p-3 text-sm"
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

        <form action={signInWithEmailAction} className="space-y-4">
          {next && <input type="hidden" name="next" value={next} />}
          <FormField
            label="E-posta"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="veli@ornek.com"
          />
          <FormField
            label="Şifre"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />
          <SubmitButton>Giriş Yap</SubmitButton>
        </form>

        <div
          className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest"
          style={{ color: 'var(--form-navy)', opacity: 0.4 }}
        >
          <span className="h-[1px] flex-1" style={{ background: 'var(--form-navy)', opacity: 0.2 }} />
          veya
          <span className="h-[1px] flex-1" style={{ background: 'var(--form-navy)', opacity: 0.2 }} />
        </div>

        <form action={signInWithGoogleAction}>
          {next && <input type="hidden" name="next" value={next} />}
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-full border-2 px-6 py-3 text-sm font-bold transition-colors hover:bg-neutral-50"
            style={{
              borderColor: 'var(--form-navy)',
              color: 'var(--form-navy)',
              fontFamily: 'var(--font-display)',
            }}
          >
            <GoogleIcon />
            Google ile devam et
          </button>
        </form>

        <p
          className="mt-6 text-center text-sm"
          style={{
            color: 'var(--form-navy)',
            opacity: 0.7,
            fontFamily: 'var(--font-body)',
          }}
        >
          Hesabın yok mu?{' '}
          <Link
            href={`/auth/sign-up${next ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="font-bold underline"
            style={{ color: 'var(--form-navy)' }}
          >
            Kayıt ol
          </Link>
        </p>
      </section>
    </main>
  );
}

function FormField({
  label,
  name,
  type,
  required,
  autoComplete,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span
        className="mb-1.5 block text-xs font-bold uppercase tracking-widest"
        style={{ color: 'var(--form-navy)' }}
      >
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full rounded-xl border-2 px-4 py-2.5 text-sm transition-colors focus:outline-none"
        style={{
          background: 'var(--whistle-cream)',
          borderColor: 'rgba(44, 62, 107, 0.2)',
          color: 'var(--form-navy)',
          fontFamily: 'var(--font-body)',
        }}
      />
    </label>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="w-full rounded-full px-6 py-3 text-sm font-bold uppercase tracking-widest transition-transform hover:scale-[1.02]"
      style={{
        background: 'var(--track-mustard)',
        color: 'var(--form-navy)',
        fontFamily: 'var(--font-display)',
        boxShadow: '0 8px 20px rgba(242, 201, 76, 0.4)',
      }}
    >
      {children}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
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
          Geliştirici: <code>.env.local</code>'a{' '}
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
