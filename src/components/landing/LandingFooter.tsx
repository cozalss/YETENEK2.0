'use client';

import Link from 'next/link';
import { ArrowUpIcon } from '@/components/icons';

const ANCHOR_LINKS = [
  { label: 'Testler', href: '#tests' },
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
        className="absolute top-0 left-0 h-[2px] w-full"
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
            className="mt-4 text-xs tracking-[0.3em] uppercase"
            style={{
              color: 'var(--whistle-cream)',
              opacity: 0.5,
              fontFamily: 'var(--font-body)',
            }}
          >
            AI Yetenek Tarama Platformu
          </p>
          <p
            className="mt-6 max-w-md text-sm leading-relaxed"
            style={{
              color: 'var(--whistle-cream)',
              opacity: 0.65,
              fontFamily: 'var(--font-body)',
            }}
          >
            8–15 yaş çocukları için cihaz-üstü pose estimation ile bio-motor
            ölçüm ve sporun branş eşleştirmesi. Veri çocuğun cihazında işlenir.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {ANCHOR_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-xs tracking-[0.2em] uppercase transition-opacity hover:opacity-70"
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
                className="text-xs tracking-[0.2em] uppercase transition-opacity hover:opacity-70"
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
              className="max-w-[18rem] text-[10px] leading-relaxed tracking-wider"
              style={{
                color: 'var(--whistle-cream)',
                opacity: 0.4,
                fontFamily: 'var(--font-body)',
              }}
            >
              Bilimsel referanslar:
              {' '}
              <span style={{ opacity: 0.75 }}>
                Bompa · Tomkinson · Croisier · Pion · Bridge · Phomsoupha
              </span>
            </p>
            <button
              type="button"
              onClick={scrollToTop}
              className="flex items-center gap-2 text-[10px] tracking-wider uppercase transition-opacity hover:opacity-70"
              style={{
                color: 'var(--whistle-cream)',
                opacity: 0.45,
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
              }}
            >
              Başa dön
              <ArrowUpIcon size={12} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
