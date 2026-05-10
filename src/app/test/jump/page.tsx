'use client';

import { useState } from 'react';
import { JumpTest } from '@/components/tests/JumpTest';

export default function JumpPage() {
  const [age, setAge] = useState(12);
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [height, setHeight] = useState<number | undefined>(undefined);

  return (
    <main className="min-h-screen bg-neutral-950 p-6 text-white md:p-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <p className="text-sm font-semibold tracking-widest text-amber-400 uppercase">
            Yetenek 2.0 · Test 1
          </p>
          <h1 className="mt-2 text-3xl font-bold md:text-5xl">Sıçrama Testi</h1>
          <p className="mt-3 max-w-2xl text-neutral-400">
            Counter-movement jump (CMJ) — patlayıcı güç ölçümü. Kalça
            keypoint'inin maksimum dikey hareketinden sıçrama yüksekliği
            hesaplanır.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-3 rounded-2xl border border-neutral-800 p-4 sm:grid-cols-3">
          <Field label="Yaş">
            <select
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm"
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
              className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm"
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
              className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm"
            />
          </Field>
        </section>

        <JumpTest childAgeYears={age} childSex={sex} childHeightCm={height} />
      </div>
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
      <div className="mb-1 text-xs tracking-wider text-neutral-400 uppercase">
        {label}
      </div>
      {children}
    </label>
  );
}
