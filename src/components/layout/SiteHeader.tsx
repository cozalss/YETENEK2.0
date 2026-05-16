/**
 * Site genelinde paylaşılan üst header.
 * Brand + ana navigasyon + CTA + giriş yapılmışsa "Hoş geldin, {veli ismi}".
 *
 * Async server component — Supabase'den oturum açan veliyi alır,
 * `user.user_metadata.full_name` veya fallback email-localpart gösterir.
 */

import Link from 'next/link';
import { env } from '@/shared/config/env-public';
import { getServerClient } from '@/lib/supabase/server';

function deriveDisplayName(
  metadata: Record<string, unknown> | null | undefined,
  email: string | null | undefined
): string | null {
  if (metadata) {
    const fullName = metadata['full_name'];
    if (typeof fullName === 'string' && fullName.trim().length > 0) {
      return fullName.trim().split(/\s+/)[0];
    }
    const displayName = metadata['displayName'];
    if (typeof displayName === 'string' && displayName.trim().length > 0) {
      return displayName.trim().split(/\s+/)[0];
    }
  }
  if (email && email.includes('@')) {
    return email.split('@')[0];
  }
  return null;
}

export async function SiteHeader() {
  let displayName: string | null = null;
  if (env.isSupabaseConfigured) {
    try {
      const supabase = await getServerClient();
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (user) {
        displayName = deriveDisplayName(user.user_metadata, user.email);
      }
    } catch {
      // Header asla render hatasıyla sayfayı düşürmesin — sessizce yut.
    }
  }

  return (
    <header
      className="border-b"
      style={{
        background: 'var(--whistle-cream)',
        borderColor: 'rgba(44, 62, 107, 0.2)',
      }}
    >
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-5 lg:px-10">
        <Link
          href="/"
          className="text-lg font-black tracking-[0.3em]"
          style={{
            color: 'var(--form-navy)',
            fontFamily: 'var(--font-display)',
          }}
        >
          YETENEK
        </Link>

        <nav
          className="hidden items-center gap-7 md:flex"
          aria-label="Ana navigasyon"
        >
          {[
            { href: '/test', label: 'TESTLER' },
            { href: '/training', label: 'ANTRENMAN' },
            { href: '/sports', label: 'SPOR REHBERİ' },
            { href: '/about', label: 'HAKKINDA' },
            { href: '/profile', label: 'CÜZDANIM' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xs font-bold tracking-[0.2em] transition-opacity hover:opacity-70"
              style={{
                color: 'var(--form-navy)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {displayName && (
            <Link
              href="/profile"
              className="hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-wider transition-opacity hover:opacity-70 md:inline-flex"
              style={{
                borderColor: 'rgba(44, 62, 107, 0.25)',
                color: 'var(--form-navy)',
                fontFamily: 'var(--font-display)',
              }}
            >
              <span
                aria-hidden="true"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black"
                style={{
                  background: 'var(--track-mustard)',
                  color: 'var(--form-navy)',
                }}
              >
                {displayName.slice(0, 1).toUpperCase()}
              </span>
              <span>
                Hoş geldin,{' '}
                <span className="font-black">{displayName}</span>
              </span>
            </Link>
          )}
          <Link
            href="/profile"
            className="inline-flex h-10 items-center gap-2 rounded-full px-5 text-[11px] font-black uppercase tracking-[0.25em] transition-transform hover:scale-[1.03]"
            style={{
              background: 'var(--form-navy)',
              color: 'var(--whistle-cream)',
              fontFamily: 'var(--font-display)',
              boxShadow:
                '0 4px 0 var(--deep-navy), 0 6px 16px rgba(0,0,0,0.15)',
            }}
          >
            Teste Başla
          </Link>
        </div>
      </div>
    </header>
  );
}
