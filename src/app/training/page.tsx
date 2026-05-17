/**
 * Antrenman programları index sayfası — 7 boyut için kart grid.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Dumbbell } from 'lucide-react';
import { SiteHeaderServer } from '@/components/layout/SiteHeaderServer';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { PROGRAM_LIST } from '@/lib/training/programs';
import { getAllTrainingPrograms } from '@/infrastructure/storage/supabase-content-repository';

export const revalidate = 300; // 5 dk ISR — antrenman içeriği nadiren değişir

export const metadata: Metadata = {
  title: 'Antrenman Programları',
  description:
    '7 bio-motor boyut için bilim destekli pediatrik antrenman programları. Bompa, ACSM Youth, GSB referansları.',
};

export default async function TrainingIndexPage() {
  // DB önceliği; eksikse static fallback
  const dbPrograms = await getAllTrainingPrograms();
  const programs =
    dbPrograms.size > 0 ? Array.from(dbPrograms.values()) : PROGRAM_LIST;
  return (
    <main className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink-1)]">
      <SiteHeaderServer />

      <div className="mx-auto max-w-6xl px-6 pt-12 pb-20 md:px-12 md:pt-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink-1)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Ana sayfa
        </Link>

        <header className="mt-10 max-w-3xl space-y-5">
          <p className="text-xs font-semibold tracking-[0.25em] text-[var(--color-signal)] uppercase">
            Antrenman
          </p>
          <h1 className="text-5xl leading-[0.95] font-bold tracking-tight md:text-7xl">
            Sonuç değil,
            <br />
            <span className="text-[var(--color-signal)]">başlangıç.</span>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-[var(--color-ink-2)] md:text-xl">
            Test çocuğunun zayıf boyutunu söyledi. Şimdi geliştirmek için 7
            boyuta özel pediatrik program. Bompa, ACSM Youth, GSB referansları.
          </p>
        </header>

        <section className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <Link
              key={p.dimension}
              href={`/training/${p.dimension}`}
              className="group flex flex-col rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6 transition-all hover:border-[var(--color-signal)]/60 hover:shadow-[0_15px_40px_-10px_rgba(246,196,83,0.25)]"
            >
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs tracking-widest text-[var(--color-signal)] uppercase">
                  {p.tagline}
                </p>
                <Dumbbell className="h-5 w-5 text-[var(--color-ink-3)] transition-colors group-hover:text-[var(--color-signal)]" />
              </div>
              <h2 className="mt-5 text-2xl leading-tight font-bold">
                {p.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-2)]">
                {p.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {p.benefitsFor.slice(0, 3).map((sport) => (
                  <span
                    key={sport}
                    className="rounded-full border border-[var(--color-line)] bg-[var(--color-canvas)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-ink-2)]"
                  >
                    {sport}
                  </span>
                ))}
              </div>
              <div className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-signal)] transition-transform group-hover:translate-x-0.5">
                Programı Aç <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
