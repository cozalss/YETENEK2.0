'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MenuIcon, XIcon } from '@/components/icons';

const NAV_ITEMS = [
  { label: 'TESTLER', href: '/test' },
  { label: 'ANTRENMAN', href: '/training' },
  { label: 'SPOR REHBERİ', href: '/sports' },
  { label: 'HAKKINDA', href: '/about' },
  { label: 'CÜZDANIM', href: '/profile' },
];

export function LandingNavigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let raf = 0;
    const apply = () => {
      raf = 0;
      setScrolled(window.scrollY > 80);
    };
    const handleScroll = () => {
      if (raf !== 0) return;
      raf = requestAnimationFrame(apply);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (raf !== 0) cancelAnimationFrame(raf);
    };
  }, []);

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav
      className="fixed top-0 left-0 z-50 w-full transition-all duration-500"
      style={{
        background: scrolled ? 'rgba(255, 245, 225, 0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '2px solid #2C3E6B' : '2px solid transparent',
      }}
    >
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6 lg:px-10">
        <Link
          href="/"
          className="text-lg font-black tracking-[0.3em]"
          style={{
            color: scrolled ? '#2C3E6B' : '#FFF5E1',
            fontFamily: 'var(--font-display)',
          }}
        >
          YETENEK
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative text-xs font-bold tracking-[0.2em] transition-colors duration-300 hover:opacity-70"
              style={{
                color: scrolled ? '#2C3E6B' : '#FFF5E1',
                fontFamily: 'var(--font-display)',
              }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/auth/sign-in?next=/profile"
            className="text-xs font-bold tracking-[0.2em] transition-colors duration-300 hover:opacity-70"
            style={{
              color: scrolled ? '#2C3E6B' : '#FFF5E1',
              fontFamily: 'var(--font-display)',
            }}
          >
            GİRİŞ
          </Link>
          <Link
            href="/auth/sign-up?next=/profile"
            className="inline-flex h-9 items-center rounded-full px-4 text-[11px] font-black tracking-[0.25em] uppercase transition-transform hover:scale-[1.04]"
            style={{
              background: scrolled
                ? 'var(--form-navy)'
                : 'var(--track-mustard)',
              color: scrolled ? 'var(--whistle-cream)' : 'var(--form-navy)',
              fontFamily: 'var(--font-display)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            }}
          >
            Teste Başla
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Menüyü kapat' : 'Menüyü aç'}
          aria-expanded={mobileOpen}
          style={{ color: scrolled ? '#2C3E6B' : '#FFF5E1' }}
        >
          {mobileOpen ? <XIcon size={24} /> : <MenuIcon size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div
          className="absolute top-16 left-0 flex w-full flex-col gap-4 px-6 py-6 md:hidden"
          style={{
            background: 'rgba(255, 245, 225, 0.98)',
            borderBottom: '2px solid #2C3E6B',
          }}
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobile}
              className="py-2 text-left text-sm font-bold tracking-[0.2em]"
              style={{
                color: '#2C3E6B',
                fontFamily: 'var(--font-display)',
              }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/auth/sign-in?next=/profile"
            onClick={() => setMobileOpen(false)}
            className="py-2 text-left text-sm font-bold tracking-[0.2em]"
            style={{
              color: '#2C3E6B',
              fontFamily: 'var(--font-display)',
            }}
          >
            GİRİŞ
          </Link>
          <Link
            href="/auth/sign-up?next=/profile"
            onClick={() => setMobileOpen(false)}
            className="mt-1 inline-flex h-10 items-center justify-center rounded-full px-4 text-[11px] font-black tracking-[0.25em] uppercase"
            style={{
              background: 'var(--track-mustard)',
              color: 'var(--form-navy)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Teste Başla
          </Link>
        </div>
      )}
    </nav>
  );
}
