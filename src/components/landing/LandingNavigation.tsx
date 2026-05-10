'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'TESTLER', href: '#tests' },
  { label: 'ANALİZ', href: '#analysis' },
  { label: 'BRANŞLAR', href: '#branches' },
  { label: 'ROZETLER', href: '#badges' },
  { label: 'TESTE BAŞLA', href: '#enroll' },
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

  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  return (
    <nav
      className="fixed left-0 top-0 z-50 w-full transition-all duration-500"
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
            <button
              key={item.href}
              type="button"
              onClick={() => scrollTo(item.href)}
              className="relative text-xs font-bold tracking-[0.2em] transition-colors duration-300 hover:opacity-70"
              style={{
                color: scrolled ? '#2C3E6B' : '#FFF5E1',
                fontFamily: 'var(--font-display)',
              }}
            >
              {item.label}
            </button>
          ))}
          <Link
            href="/profile"
            className="text-xs font-bold tracking-[0.2em] transition-colors duration-300 hover:opacity-70"
            style={{
              color: scrolled ? '#2C3E6B' : '#FFF5E1',
              fontFamily: 'var(--font-display)',
            }}
          >
            CÜZDAN
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menüyü aç"
          style={{ color: scrolled ? '#2C3E6B' : '#FFF5E1' }}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div
          className="absolute left-0 top-16 flex w-full flex-col gap-4 px-6 py-6 md:hidden"
          style={{
            background: 'rgba(255, 245, 225, 0.98)',
            borderBottom: '2px solid #2C3E6B',
          }}
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => scrollTo(item.href)}
              className="py-2 text-left text-sm font-bold tracking-[0.2em]"
              style={{
                color: '#2C3E6B',
                fontFamily: 'var(--font-display)',
              }}
            >
              {item.label}
            </button>
          ))}
          <Link
            href="/profile"
            onClick={() => setMobileOpen(false)}
            className="py-2 text-left text-sm font-bold tracking-[0.2em]"
            style={{
              color: '#2C3E6B',
              fontFamily: 'var(--font-display)',
            }}
          >
            CÜZDAN
          </Link>
        </div>
      )}
    </nav>
  );
}
