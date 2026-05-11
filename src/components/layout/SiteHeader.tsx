/**
 * Site genelinde paylaşılan üst header.
 * Brand + ana navigasyon + CTA. LandingPage tasarım dilinde.
 */

import Link from 'next/link';

export function SiteHeader() {
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

        <Link
          href="/profile"
          className="inline-flex h-10 items-center gap-2 rounded-full px-5 text-[11px] font-black uppercase tracking-[0.25em] transition-transform hover:scale-[1.03]"
          style={{
            background: 'var(--form-navy)',
            color: 'var(--whistle-cream)',
            fontFamily: 'var(--font-display)',
            boxShadow: '0 4px 0 var(--deep-navy), 0 6px 16px rgba(0,0,0,0.15)',
          }}
        >
          Teste Başla
        </Link>
      </div>
    </header>
  );
}
