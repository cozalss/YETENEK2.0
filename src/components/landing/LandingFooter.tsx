'use client';

import Link from 'next/link';
import { ArrowUp } from 'lucide-react';

const ANCHOR_LINKS = [
  { label: 'Tests', href: '#tests' },
  { label: 'Analiz', href: '#analysis' },
  { label: 'Branşlar', href: '#branches' },
  { label: 'Rozetler', href: '#badges' },
  { label: 'Başla', href: '#enroll' },
];

const PAGE_LINKS = [
  { label: 'Hakkında', href: '/about' },
  { label: 'Antrenman', href: '/training' },
  { label: 'Spor Rehberi', href: '/sports' },
  { label: 'Geçmişim', href: '/history' },
  { label: 'KVKK', href: '/privacy' },
  { label: 'Şartlar', href: '/terms' },
];

export function LandingFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer
      className="relative py-16"
      style={{ background: 'var(--form-navy)' }}
    >
      <div
        className="absolute left-0 top-0 h-[2px] w-full"
        style={{ background: 'var(--track-mustard)' }}
      />

      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="flex flex-col items-center text-center">
          <h2
            className="text-3xl font-black tracking-[0.3em] md:text-4xl"
            style={{
              color: 'var(--whistle-cream)',
              fontFamily: 'var(--font-display)',
            }}
          >
            YETENEK
          </h2>
          <div
            className="mx-auto mt-4 h-[2px] w-16"
            style={{ background: 'var(--track-mustard)' }}
          />
          <p
            className="mt-4 text-xs uppercase tracking-[0.3em]"
            style={{
              color: 'var(--whistle-cream)',
              opacity: 0.5,
              fontFamily: 'var(--font-body)',
            }}
          >
            Where Symmetry Meets Talent
          </p>
          <p
            className="mt-6 max-w-md text-sm leading-relaxed"
            style={{
              color: 'var(--whistle-cream)',
              opacity: 0.6,
              fontFamily: 'var(--font-body)',
            }}
          >
            5–16 yaş çocuklar için AI tabanlı spor yetenek keşfi. Geleceğin
            şampiyonlarını biyomekanik hassasiyetle ortaya çıkarır.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {ANCHOR_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-xs uppercase tracking-[0.2em] transition-opacity hover:opacity-70"
                style={{
                  color: 'var(--whistle-cream)',
                  opacity: 0.55,
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                }}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {PAGE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs uppercase tracking-[0.2em] transition-opacity hover:opacity-70"
                style={{
                  color: 'var(--whistle-cream)',
                  opacity: 0.4,
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div
            className="mt-10 h-[1px] w-full"
            style={{ background: 'rgba(255, 245, 225, 0.1)' }}
          />

          <div className="mt-8 flex w-full flex-col items-center justify-between gap-4 sm:flex-row">
            <p
              className="text-[10px] tracking-wider"
              style={{
                color: 'var(--whistle-cream)',
                opacity: 0.35,
                fontFamily: 'var(--font-body)',
              }}
            >
              © {new Date().getFullYear()} YETENEK. Tüm hakları saklıdır.
            </p>
            <p
              className="text-[10px] tracking-wider"
              style={{
                color: 'var(--whistle-cream)',
                opacity: 0.3,
                fontFamily: 'var(--font-body)',
              }}
            >
              Bompa · Tomkinson · Croisier · Pion · Bridge · Phomsoupha
            </p>
            <button
              type="button"
              onClick={scrollToTop}
              className="flex items-center gap-2 text-[10px] uppercase tracking-wider transition-opacity hover:opacity-70"
              style={{
                color: 'var(--whistle-cream)',
                opacity: 0.45,
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
              }}
            >
              Başa dön
              <ArrowUp size={12} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
