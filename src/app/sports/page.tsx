/**
 * Spor rehberi index — 12 spor branşı kart grid.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, MapPin } from 'lucide-react';
import { SiteHeaderServer } from '@/components/layout/SiteHeaderServer';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SPORTS } from '@/lib/content/sports';
import { getAllSports } from '@/infrastructure/storage/supabase-content-repository';

export const revalidate = 300; // 5 dk ISR — spor içeriği nadiren değişir

export const metadata: Metadata = {
  title: 'Spor Rehberi',
  description:
    '12 spor branşı için başlama yaşı, donanım, federasyon, Türkiye altyapısı ve ortalama ücret bilgisi.',
};

export default async function SportsIndexPage() {
  // DB önceliği; boşsa static fallback (yeni proje / offline)
  const dbSports = await getAllSports();
  const sports = dbSports.length > 0 ? dbSports : SPORTS;
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
            Spor Rehberi
          </p>
          <h1 className="text-5xl leading-[0.95] font-bold tracking-tight md:text-7xl">
            12 branş.
            <br />
            <span className="text-[var(--color-signal)]">
              Türkiye haritası.
            </span>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-[var(--color-ink-2)] md:text-xl">
            Çocuğun profili bir spor önerirken, sen veli olarak "nereden
            başlayayım, ne kadar tutar, hangi yaşta?" sorularına cevap
            arıyorsun. Her branş için somut bilgi.
          </p>
        </header>

        <section className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {sports.map((sport) => (
            <Link
              key={sport.slug}
              href={`/sports/${sport.slug}`}
              className="group flex flex-col rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6 transition-all hover:border-[var(--color-signal)]/60 hover:shadow-[0_15px_40px_-10px_rgba(246,196,83,0.25)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl" aria-hidden="true">
                  {sport.emoji}
                </span>
                <span className="font-mono text-[11px] tracking-wider text-[var(--color-ink-3)] uppercase">
                  {sport.startAge}
                </span>
              </div>
              <h2 className="mt-5 text-2xl leading-tight font-bold">
                {sport.name}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-2)]">
                {sport.description}
              </p>
              <div className="mt-5 flex items-center gap-2 text-xs text-[var(--color-ink-3)]">
                <MapPin className="h-3.5 w-3.5" />
                <span>{sport.federation.name}</span>
                <span>·</span>
                <span className="font-mono">{sport.monthlyCost}</span>
              </div>
              <div className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-signal)] transition-transform group-hover:translate-x-0.5">
                Detaylar <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
