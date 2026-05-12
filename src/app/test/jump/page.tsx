'use client';

import { useState } from 'react';
import { JumpTest } from '@/components/tests/JumpTest';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default function JumpPage() {
  const [age, setAge] = useState(12);
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [height, setHeight] = useState<number | undefined>(undefined);

  const inputClass =
    'h-10 w-full rounded-lg border-2 px-3 text-sm font-medium';
  const inputStyle: React.CSSProperties = {
    background: 'var(--color-canvas)',
    borderColor: 'var(--color-line-strong)',
    color: 'var(--form-navy)',
  };

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
            Tek Test · 01
          </p>
          <h1
            className="mt-2 text-3xl font-black md:text-5xl"
            style={{
              color: 'var(--form-navy)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Sıçrama Testi
          </h1>
          <p
            className="mt-3 max-w-2xl leading-relaxed"
            style={{ color: 'var(--color-ink-2)' }}
          >
            Counter-movement jump (CMJ) — patlayıcı güç ölçümü. Kalça
            keypoint'inin maksimum dikey hareketinden sıçrama yüksekliği
            hesaplanır.
          </p>
        </header>

        <section
          className="grid grid-cols-1 gap-3 rounded-2xl border-2 p-4 sm:grid-cols-3"
          style={{
            background: 'var(--color-surface-elevated)',
            borderColor: 'var(--color-line)',
          }}
        >
          <Field label="Yaş">
            <select
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className={inputClass}
              style={inputStyle}
            >
              {Array.from({ length: 8 }, (_, i) => i + 8).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cinsiyet">
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value as 'male' | 'female')}
              className={inputClass}
              style={inputStyle}
            >
              <option value="male">Erkek</option>
              <option value="female">Kız</option>
            </select>
          </Field>
          <Field label="Boy (cm) — opsiyonel">
            <input
              type="number"
              min={100}
              max={200}
              placeholder="örn. 140"
              value={height ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setHeight(v === '' ? undefined : Number(v));
              }}
              className={inputClass}
              style={inputStyle}
            />
          </Field>
        </section>

        <JumpTest childAgeYears={age} childSex={sex} childHeightCm={height} />
      </div>
      <SiteFooter />
    </main>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <label className="block">
      <div
        className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em]"
        style={{
          color: 'var(--color-ink-3)',
          fontFamily: 'var(--font-display)',
        }}
      >
        {label}
      </div>
      {children}
    </label>
  );
}
