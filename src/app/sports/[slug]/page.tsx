/**
 * Tek spor branşı detay sayfası.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Coins,
  ExternalLink,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SPORTS, getSport } from '@/lib/content/sports';

export function generateStaticParams() {
  return SPORTS.map((s) => ({ slug: s.slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sport = getSport(slug);
  if (!sport) return { title: 'Spor bulunamadı' };
  return {
    title: `${sport.name} · Spor Rehberi`,
    description: sport.description,
  };
}

export default async function SportDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const sport = getSport(slug);
  if (!sport) notFound();

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink-1)]">
      <SiteHeader />

      <div className="mx-auto max-w-4xl px-6 pt-12 pb-20 md:px-12 md:pt-20">
        <Link
          href="/sports"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink-1)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Tüm branşlar
        </Link>

        {/* Hero */}
        <header className="mt-10 flex items-start gap-6">
          <span className="text-7xl md:text-8xl" aria-hidden="true">
            {sport.emoji}
          </span>
          <div className="flex-1 space-y-3">
            <p className="font-mono text-xs tracking-[0.25em] text-[var(--color-signal)] uppercase">
              Spor Rehberi
            </p>
            <h1 className="text-5xl leading-[0.95] font-bold tracking-tight md:text-6xl">
              {sport.name}
            </h1>
          </div>
        </header>

        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[var(--color-ink-2)]">
          {sport.description}
        </p>

        {/* Quick facts grid */}
        <section className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Fact icon={Calendar} label="Başlama Yaşı" value={sport.startAge} />
          <Fact icon={Coins} label="Aylık Ücret" value={sport.monthlyCost} />
          <Fact icon={Sparkles} label="Sezon" value={sport.season} />
          <Fact icon={MapPin} label="Federasyon" value={sport.federation.name} />
        </section>

        {/* Highlights */}
        <section className="mt-16">
          <p className="text-xs font-semibold tracking-[0.25em] text-[var(--color-signal)] uppercase">
            Öne Çıkanlar
          </p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">
            Bu spor sana ne katar?
          </h2>
          <ul className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
            {sport.highlights.map((h, idx) => (
              <li
                key={idx}
                className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
              >
                <span className="font-mono text-xs tracking-wider text-[var(--color-signal)]">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-1)]">
                  {h}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Türkiye context */}
        <section className="mt-16 rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-7">
          <p className="text-xs font-semibold tracking-[0.25em] text-[var(--color-signal)] uppercase">
            Türkiye'de Durum
          </p>
          <h2 className="mt-3 text-2xl font-bold md:text-3xl">
            Altyapı, kulüpler, sporcular
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-ink-2)]">
            {sport.turkeyContext}
          </p>
          <p className="mt-6 text-sm text-[var(--color-ink-3)]">
            Donanım: {sport.equipment}
          </p>
        </section>

        {/* CTA */}
        <section className="mt-16 grid grid-cols-1 gap-3 md:grid-cols-2">
          <a
            href={sport.federation.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center justify-between rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6 transition-colors hover:border-[var(--color-signal)]/60"
          >
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-[var(--color-signal)] uppercase">
                Resmi Federasyon
              </p>
              <p className="mt-2 text-lg font-bold">{sport.federation.name}</p>
              <p className="mt-1 text-xs text-[var(--color-ink-3)]">
                Kulüpleri ve yarışları gör
              </p>
            </div>
            <ExternalLink className="h-5 w-5 text-[var(--color-ink-3)] transition-colors group-hover:text-[var(--color-signal)]" />
          </a>
          <Link
            href="/profile"
            className="group flex items-center justify-between rounded-3xl border border-[var(--color-signal)]/30 bg-[var(--color-signal)]/5 p-6 transition-all hover:border-[var(--color-signal)]/60 hover:bg-[var(--color-signal)]/10"
          >
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-[var(--color-signal)] uppercase">
                Test Et
              </p>
              <p className="mt-2 text-lg font-bold">{sport.name} Profilim?</p>
              <p className="mt-1 text-xs text-[var(--color-ink-3)]">
                5 dakikada öğren
              </p>
            </div>
            <ArrowLeft className="h-5 w-5 -scale-x-100 text-[var(--color-signal)] transition-transform group-hover:translate-x-0.5" />
          </Link>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-[var(--color-ink-3)] uppercase">
        <Icon className="h-3.5 w-3.5 text-[var(--color-signal)]" />
        {label}
      </div>
      <div className="mt-2 text-sm font-bold text-[var(--color-ink-1)]">
        {value}
      </div>
    </div>
  );
}
