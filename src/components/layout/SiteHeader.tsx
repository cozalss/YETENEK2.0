/**
 * Site genelinde paylaşılan üst header.
 * Brand + ana navigasyon + CTA. Mobile'da hamburger yerine sadece CTA görünür.
 */

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function SiteHeader() {
  return (
    <header className="border-b border-[var(--color-line)] bg-[var(--color-canvas)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-12">
        <Link
          href="/"
          className="font-display text-xl font-bold tracking-tight text-[var(--color-ink-1)]"
        >
          Yetenek<span className="text-[var(--color-signal)]">.</span>
        </Link>

        <nav
          className="hidden items-center gap-7 text-sm font-medium text-[var(--color-ink-2)] md:flex"
          aria-label="Ana navigasyon"
        >
          <Link
            href="/test"
            className="transition-colors hover:text-[var(--color-ink-1)]"
          >
            Testler
          </Link>
          <Link
            href="/training"
            className="transition-colors hover:text-[var(--color-ink-1)]"
          >
            Antrenman
          </Link>
          <Link
            href="/sports"
            className="transition-colors hover:text-[var(--color-ink-1)]"
          >
            Spor Rehberi
          </Link>
          <Link
            href="/about"
            className="transition-colors hover:text-[var(--color-ink-1)]"
          >
            Hakkında
          </Link>
          <Link
            href="/profile"
            className="transition-colors hover:text-[var(--color-ink-1)]"
          >
            Cüzdanım
          </Link>
        </nav>

        <Link
          href="/test/full"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--color-signal)] px-4 text-sm font-semibold text-[var(--color-canvas)] shadow-[0_8px_30px_-8px_rgba(246,196,83,0.5)] transition-colors hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)] focus-visible:outline-none"
        >
          Teste Başla
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}
