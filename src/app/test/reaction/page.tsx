'use client';

import { useState } from 'react';
import { ReactionTest } from '@/components/tests/ReactionTest';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default function ReactionPage() {
  const [age, setAge] = useState(12);

  return (
    <main
      className="min-h-screen"
      style={{ background: 'var(--whistle-cream)', color: 'var(--form-navy)' }}
    >
      <SiteHeader />
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-12 md:px-12 md:py-16">
        <header>
          <p
            className="text-xs font-bold tracking-[0.3em] uppercase"
            style={{
              color: 'var(--color-ink-3)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Tek Test · 03
          </p>
          <h1
            className="mt-2 text-3xl font-black md:text-5xl"
            style={{
              color: 'var(--form-navy)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Reaksiyon Testi
          </h1>
          <p
            className="mt-3 max-w-2xl leading-relaxed"
            style={{ color: 'var(--color-ink-2)' }}
          >
            Bilişsel hız ölçümü. Ekran yeşile döndüğünde dokun, AI reaksiyon
            süreni milisaniye hassasiyetinde ölçer. 5 deneme + tutarlılık
            skoru.
          </p>
        </header>

        <section
          className="rounded-2xl border-2 p-4"
          style={{
            background: 'var(--color-surface-elevated)',
            borderColor: 'var(--color-line)',
          }}
        >
          <label className="block">
            <div
              className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em]"
              style={{
                color: 'var(--color-ink-3)',
                fontFamily: 'var(--font-display)',
              }}
            >
              Yaş
            </div>
            <select
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="h-10 w-32 rounded-lg border-2 px-3 text-sm font-medium"
              style={{
                background: 'var(--color-canvas)',
                borderColor: 'var(--color-line-strong)',
                color: 'var(--form-navy)',
              }}
            >
              {Array.from({ length: 8 }, (_, i) => i + 8).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </section>

        <ReactionTest childAgeYears={age} />
      </div>
      <SiteFooter />
    </main>
  );
}
