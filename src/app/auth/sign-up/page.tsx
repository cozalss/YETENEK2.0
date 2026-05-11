/**
 * Kayıt sayfası — yeni veli hesabı oluşturma.
 *
 * Form: ad + e-posta + parola + parola tekrar. Email confirm açıksa
 * doğrulama linki gönderilir; kullanıcı linke tıklayınca /auth/callback'e
 * gelir ve giriş tamamlanır.
 */

import Link from 'next/link';
import {
  signInWithGoogleAction,
  signUpWithEmailAction,
} from '@/app/auth/actions';
import { env } from '@/shared/config/env-public';

interface PageProps {
  searchParams: Promise<{
    next?: string;
    error?: string;
    info?: string;
  }>;
}

export default async function SignUpPage({ searchParams }: PageProps) {
  const { next, error, info } = await searchParams;

  if (!env.isSupabaseConfigured) {
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
            Kayıt servisi yapılandırılmamış
          </h1>
          <p
            className="mt-3 text-sm"
            style={{ color: 'var(--form-navy)', opacity: 0.7 }}
          >
            <code>NEXT_PUBLIC_SUPABASE_*</code> eksik.
          </p>
        </section>
      </main>
    );
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
            Hesap oluştur
          </h1>
          <p
            className="mt-2 text-sm"
            style={{
              color: 'var(--form-navy)',
              opacity: 0.7,
              fontFamily: 'var(--font-body)',
            }}
          >
            Veli olarak çocuklarını ekle, her birinin yetenek profilini
            oluştur.
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

        <form action={signUpWithEmailAction} className="space-y-4">
          {next && <input type="hidden" name="next" value={next} />}
          <Field
            label="Adın"
            name="fullName"
            type="text"
            required
            autoComplete="name"
            placeholder="Ayşe Yılmaz"
          />
          <Field
            label="E-posta"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="veli@ornek.com"
          />
          <Field
            label="Şifre"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="En az 8 karakter, harf + rakam"
          />
          <Field
            label="Şifre tekrar"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
          />
          <Submit>Kayıt Ol</Submit>
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
            Google ile kayıt ol
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
          Hesabın var mı?{' '}
          <Link
            href={`/auth/sign-in${next ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="font-bold underline"
            style={{ color: 'var(--form-navy)' }}
          >
            Giriş yap
          </Link>
        </p>
      </section>
    </main>
  );
}

function Field({
  label,
  name,
  type,
  required,
  autoComplete,
  placeholder,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
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

function Submit({ children }: { children: React.ReactNode }) {
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
