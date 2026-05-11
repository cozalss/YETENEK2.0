'use client';

import { useState } from 'react';
import { ReactionTest } from '@/components/tests/ReactionTest';

export default function ReactionPage() {
  const [age, setAge] = useState(12);

  return (
    <main
      className="min-h-screen p-6 md:p-12"
      style={{ background: 'var(--whistle-cream)', color: 'var(--form-navy)' }}
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <p className="text-sm font-semibold tracking-widest text-amber-400 uppercase">
            Yetenek 2.0 · Test 3
          </p>
          <h1 className="mt-2 text-3xl font-bold md:text-5xl">
            Reaksiyon Testi
          </h1>
          <p className="mt-3 max-w-2xl text-neutral-400">
            Bilişsel hız ölçümü. Ekran yeşile döndüğünde dokun, AI reaksiyon
            süreni milisaniye hassasiyetinde ölçer. 5 deneme + tutarlılık
            skoru.
          </p>
        </header>

        <section className="rounded-2xl border border-neutral-800 p-4">
          <label className="block">
            <div className="mb-1 text-xs uppercase tracking-wider text-neutral-400">
              Yaş
            </div>
            <select
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="h-10 w-32 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm"
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
    </main>
  );
}
