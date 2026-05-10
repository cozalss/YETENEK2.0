/**
 * Tek boyutlu antrenman programı sayfası.
 * /training/explosivePower, /training/balance, vs.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, ShieldAlert, Trophy } from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { TRAINING_PROGRAMS, PROGRAM_LIST } from '@/lib/training/programs';
import type { DimensionKey } from '@/lib/matching/sportProfiles';

export function generateStaticParams() {
  return PROGRAM_LIST.map((p) => ({ dimension: p.dimension }));
}

interface PageProps {
  params: Promise<{ dimension: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { dimension } = await params;
  const program = TRAINING_PROGRAMS[dimension as DimensionKey];
  if (!program) return { title: 'Program bulunamadı' };
  return {
    title: `${program.title} · Antrenman`,
    description: program.description,
  };
}

export default async function TrainingDimensionPage({ params }: PageProps) {
  const { dimension } = await params;
  const program = TRAINING_PROGRAMS[dimension as DimensionKey];
  if (!program) notFound();

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink-1)]">
      <SiteHeader />

      <div className="mx-auto max-w-4xl px-6 pt-12 pb-20 md:px-12 md:pt-20">
        <Link
          href="/training"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink-1)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Tüm programlar
        </Link>

        {/* Hero */}
        <header className="mt-10 space-y-5">
          <p className="font-mono text-xs tracking-[0.25em] text-[var(--color-signal)] uppercase">
            {program.tagline}
          </p>
          <h1 className="text-5xl leading-[0.95] font-bold tracking-tight text-balance md:text-6xl">
            {program.title}
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed text-[var(--color-ink-2)]">
            {program.description}
          </p>
        </header>

        {/* Meta grid */}
        <section className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Meta label="Frekans" value={program.frequency} />
          <Meta label="Süre" value={program.duration} />
          <Meta
            label="Hedef Sporlar"
            value={`${program.benefitsFor.length} branş`}
          />
          <Meta label="Egzersiz" value={`${program.exercises.length} hareket`} />
        </section>

        {/* Hedef sporlar */}
        <section className="mt-12 rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
          <p className="text-xs font-semibold tracking-[0.25em] text-[var(--color-signal)] uppercase">
            Hangi sporlara fayda?
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Trophy className="h-4 w-4 text-[var(--color-signal)]" />
            {program.benefitsFor.map((sport) => (
              <span
                key={sport}
                className="rounded-full border border-[var(--color-line)] bg-[var(--color-canvas)] px-3 py-1 text-sm font-medium text-[var(--color-ink-1)]"
              >
                {sport}
              </span>
            ))}
          </div>
        </section>

        {/* Egzersizler */}
        <section className="mt-16">
          <p className="text-xs font-semibold tracking-[0.25em] text-[var(--color-signal)] uppercase">
            Egzersizler
          </p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">
            {program.exercises.length} hareket. {program.duration}.
          </h2>

          <ol className="mt-10 space-y-4">
            {program.exercises.map((ex, idx) => (
              <li
                key={ex.name}
                className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6"
              >
                <div className="flex items-start gap-4">
                  <span className="font-mono shrink-0 grid h-10 w-10 place-items-center rounded-full bg-[var(--color-canvas)] text-sm font-bold text-[var(--color-signal)]">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1">
                    <h3 className="flex items-baseline gap-2 text-xl font-bold">
                      {ex.emoji && <span aria-hidden="true">{ex.emoji}</span>}
                      {ex.name}
                    </h3>
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-canvas)] px-3 py-1">
                      <Calendar className="h-3.5 w-3.5 text-[var(--color-signal)]" />
                      <span className="font-mono text-xs text-[var(--color-ink-1)]">
                        {ex.prescription}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-2)]">
                      {ex.description}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Güvenlik notu */}
        <section className="mt-12 rounded-3xl border border-amber-500/40 bg-amber-500/5 p-6">
          <div className="flex items-start gap-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <h3 className="text-base font-bold text-amber-200">
                Güvenlik notu
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-amber-100/90">
                {program.safetyNote}
              </p>
              <p className="mt-3 text-xs text-amber-100/70">
                Bu program ön-uzman doğrulaması bekliyor. Çocuğun sağlık
                durumuna göre antrenör veya çocuk doktoru görüşü almak
                önerilir.
              </p>
            </div>
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <div className="text-[11px] font-semibold tracking-wider text-[var(--color-ink-3)] uppercase">
        {label}
      </div>
      <div className="mt-1.5 text-sm font-bold text-[var(--color-ink-1)]">
        {value}
      </div>
    </div>
  );
}
