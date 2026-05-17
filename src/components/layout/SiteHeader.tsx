/**
 * Site genelinde paylaşılan üst header — SAFE for client + server.
 *
 * Bu sync presentational bileşen — Supabase fetch'i yok. Welcome badge için
 * sunucu pages `displayName` prop'unu geçer veya doğrudan `SiteHeaderServer`
 * (server-only wrapper) kullanır.
 *
 * Önceki versiyon async + getServerClient ile birlikteydi; 'use client'
 * sayfalardan import edilince `server-only` import zincirini kırıyordu.
 */

import Link from 'next/link';

interface Props {
  /** Sunucu tarafında türetilmiş veli adı — varsa "Hoş geldin" rozeti. */
  displayName?: string | null;
}

export function SiteHeader({ displayName }: Props = {}) {
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
                Hoş geldin, <span className="font-black">{displayName}</span>
              </span>
            </Link>
          )}
          {!displayName && (
            <Link
              href="/auth/sign-in?next=/profile"
              className="hidden text-xs font-bold tracking-[0.2em] transition-opacity hover:opacity-70 md:inline-flex"
              style={{
                color: 'var(--form-navy)',
                fontFamily: 'var(--font-display)',
              }}
            >
              GİRİŞ
            </Link>
          )}
          <Link
            href="/profile"
            className="inline-flex h-10 items-center gap-2 rounded-full px-5 text-[11px] font-black tracking-[0.25em] uppercase transition-transform hover:scale-[1.03]"
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
